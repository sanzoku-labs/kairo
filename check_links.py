#!/usr/bin/env python3
"""
Dead Link Detection Script for Kairo Documentation

This script scans all markdown files in the docs directory and identifies:
- Dead internal links (missing files)
- Invalid anchor links (missing sections)
- Broken external links (network errors)
"""

import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
import socket
import time


class LinkChecker:
    def __init__(self, docs_root: str):
        self.docs_root = Path(docs_root)
        self.dead_links: List[Dict] = []
        self.external_timeout = 10
        self.checked_external_urls: Dict[str, bool] = {}
    
    def _safe_relative_path(self, path: Path) -> str:
        """Safely get relative path, handling cases where path is outside docs_root"""
        try:
            return str(path.relative_to(self.docs_root))
        except ValueError:
            return str(path)
        
    def find_markdown_files(self) -> List[Path]:
        """Find all markdown files in the docs directory"""
        return list(self.docs_root.rglob('*.md'))
    
    def extract_links(self, content: str) -> List[Tuple[str, str]]:
        """Extract all markdown links from content"""
        # Pattern for markdown links: [text](link)
        # But exclude cases where it's inside code blocks or is part of array syntax
        pattern = r'(?<!`)\[([^\]]*)\]\(([^)]+)\)(?!`)'
        
        # Also exclude patterns that look like code (e.g., service[method](url, config))
        matches = re.findall(pattern, content)
        
        # Filter out matches that are likely code patterns
        filtered_matches = []
        for text, link in matches:
            # Skip if the link contains comma and spaces (likely function parameters)
            if ', ' in link and not link.startswith(('http://', 'https://', '/', '#', './')):
                continue
            # Skip if it's just variable names without path separators
            if not any(char in link for char in ['/', '#', '.', 'http']) and ' ' not in link:
                continue
            filtered_matches.append((text, link))
        
        return filtered_matches
    
    def extract_headings(self, content: str) -> Set[str]:
        """Extract all headings from markdown content for anchor checking"""
        headings = set()
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            # Match # ## ### etc. headings
            if line.startswith('#'):
                # Extract heading text and convert to anchor format
                heading_text = re.sub(r'^#+\s*', '', line)
                # Convert to anchor format (lowercase, replace spaces with dashes)
                anchor = heading_text.lower().replace(' ', '-')
                # Remove special characters except dashes
                anchor = re.sub(r'[^a-z0-9-]', '', anchor)
                headings.add(anchor)
        
        return headings
    
    def is_external_link(self, link: str) -> bool:
        """Check if link is external (starts with http/https)"""
        return link.startswith(('http://', 'https://'))
    
    def resolve_relative_path(self, file_path: Path, link: str) -> Path:
        """Resolve relative path from current file to target"""
        # Remove anchor if present
        link = link.split('#')[0]
        
        if link.startswith('/'):
            # Absolute path from docs root (VitePress style)
            # Add .md extension if not present
            target_path = link.lstrip('/')
            if not target_path.endswith('.md') and not target_path.endswith('/'):
                target_path += '.md'
            elif target_path.endswith('/'):
                target_path += 'index.md'
            return self.docs_root / target_path
        else:
            # Relative path from current file
            target_path = link
            if not target_path.endswith('.md') and not target_path.endswith('/'):
                target_path += '.md'
            elif target_path.endswith('/'):
                target_path += 'index.md'
            return (file_path.parent / target_path).resolve()
    
    def check_internal_link(self, file_path: Path, link: str, link_text: str) -> Optional[Dict]:
        """Check if internal link exists"""
        # Split link and anchor
        parts = link.split('#')
        target_path = parts[0]
        anchor = parts[1] if len(parts) > 1 else None
        
        if not target_path:
            # Just an anchor link within the same file
            if anchor:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    headings = self.extract_headings(content)
                    if anchor not in headings:
                        return {
                            'type': 'anchor',
                            'file': str(file_path.relative_to(self.docs_root)),
                            'link': link,
                            'text': link_text,
                            'error': f'Anchor #{anchor} not found in file'
                        }
            return None
        
        # Resolve the target file path
        resolved_path = self.resolve_relative_path(file_path, target_path)
        
        # Check if file exists
        if not resolved_path.exists():
            relative_path = self._safe_relative_path(resolved_path)
            return {
                'type': 'file',
                'file': str(file_path.relative_to(self.docs_root)),
                'link': link,
                'text': link_text,
                'error': f'File not found: {relative_path}'
            }
        
        # If anchor is specified, check if it exists in target file
        if anchor:
            try:
                with open(resolved_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    headings = self.extract_headings(content)
                    if anchor not in headings:
                        return {
                            'type': 'anchor',
                            'file': str(file_path.relative_to(self.docs_root)),
                            'link': link,
                            'text': link_text,
                            'error': f'Anchor #{anchor} not found in {self._safe_relative_path(resolved_path)}'
                        }
            except Exception as e:
                return {
                    'type': 'file',
                    'file': str(file_path.relative_to(self.docs_root)),
                    'link': link,
                    'text': link_text,
                    'error': f'Error reading file {self._safe_relative_path(resolved_path)}: {str(e)}'
                }
        
        return None
    
    def check_external_link(self, file_path: Path, link: str, link_text: str) -> Optional[Dict]:
        """Check if external link is accessible"""
        # Skip if we've already checked this URL
        if link in self.checked_external_urls:
            if not self.checked_external_urls[link]:
                return {
                    'type': 'external',
                    'file': str(file_path.relative_to(self.docs_root)),
                    'link': link,
                    'text': link_text,
                    'error': 'URL not accessible (cached result)'
                }
            return None
        
        try:
            # Set up request with timeout
            req = urllib.request.Request(link, headers={'User-Agent': 'Link-Checker/1.0'})
            with urllib.request.urlopen(req, timeout=self.external_timeout) as response:
                if response.status == 200:
                    self.checked_external_urls[link] = True
                    return None
                else:
                    self.checked_external_urls[link] = False
                    return {
                        'type': 'external',
                        'file': str(file_path.relative_to(self.docs_root)),
                        'link': link,
                        'text': link_text,
                        'error': f'HTTP {response.status}'
                    }
        except (urllib.error.URLError, socket.timeout, Exception) as e:
            self.checked_external_urls[link] = False
            return {
                'type': 'external',
                'file': str(file_path.relative_to(self.docs_root)),
                'link': link,
                'text': link_text,
                'error': f'Network error: {str(e)}'
            }
    
    def check_file(self, file_path: Path) -> List[Dict]:
        """Check all links in a single file"""
        dead_links = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return dead_links
        
        links = self.extract_links(content)
        
        for link_text, link in links:
            if self.is_external_link(link):
                result = self.check_external_link(file_path, link, link_text)
            else:
                result = self.check_internal_link(file_path, link, link_text)
            
            if result:
                dead_links.append(result)
        
        return dead_links
    
    def check_all_files(self) -> Dict:
        """Check all markdown files for dead links"""
        markdown_files = self.find_markdown_files()
        
        print(f"Found {len(markdown_files)} markdown files")
        print("Checking links...")
        
        all_dead_links = []
        files_with_issues = {}
        
        for i, file_path in enumerate(markdown_files, 1):
            print(f"[{i}/{len(markdown_files)}] Checking {file_path.relative_to(self.docs_root)}")
            
            dead_links = self.check_file(file_path)
            if dead_links:
                files_with_issues[str(file_path.relative_to(self.docs_root))] = dead_links
                all_dead_links.extend(dead_links)
        
        # Categorize results
        file_errors = [link for link in all_dead_links if link['type'] == 'file']
        anchor_errors = [link for link in all_dead_links if link['type'] == 'anchor']
        external_errors = [link for link in all_dead_links if link['type'] == 'external']
        
        return {
            'total_files': len(markdown_files),
            'files_with_issues': len(files_with_issues),
            'total_dead_links': len(all_dead_links),
            'file_errors': file_errors,
            'anchor_errors': anchor_errors,
            'external_errors': external_errors,
            'files_with_issues': files_with_issues
        }
    
    def generate_report(self, results: Dict) -> str:
        """Generate a comprehensive report of dead links"""
        report = []
        report.append("# Dead Link Detection Report")
        report.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Summary
        report.append("## Summary")
        report.append(f"- **Total files scanned**: {results['total_files']}")
        report.append(f"- **Files with issues**: {results['files_with_issues']}")
        report.append(f"- **Total dead links**: {results['total_dead_links']}")
        report.append(f"- **Missing files**: {len(results['file_errors'])}")
        report.append(f"- **Invalid anchors**: {len(results['anchor_errors'])}")
        report.append(f"- **External link errors**: {len(results['external_errors'])}")
        report.append("")
        
        # Missing files
        if results['file_errors']:
            report.append("## Missing Files")
            for error in results['file_errors']:
                report.append(f"- **{error['file']}**: `{error['link']}` - {error['error']}")
            report.append("")
        
        # Invalid anchors
        if results['anchor_errors']:
            report.append("## Invalid Anchors")
            for error in results['anchor_errors']:
                report.append(f"- **{error['file']}**: `{error['link']}` - {error['error']}")
            report.append("")
        
        # External link errors
        if results['external_errors']:
            report.append("## External Link Errors")
            for error in results['external_errors']:
                report.append(f"- **{error['file']}**: `{error['link']}` - {error['error']}")
            report.append("")
        
        # File-by-file breakdown
        if results['files_with_issues']:
            report.append("## File-by-File Breakdown")
            for file_path, issues in results['files_with_issues'].items():
                report.append(f"### {file_path}")
                for issue in issues:
                    report.append(f"- `{issue['link']}` ({issue['type']}): {issue['error']}")
                report.append("")
        
        return "\n".join(report)


def main():
    docs_root = "docs"
    
    if not os.path.exists(docs_root):
        print(f"Error: docs directory '{docs_root}' not found")
        sys.exit(1)
    
    checker = LinkChecker(docs_root)
    results = checker.check_all_files()
    
    report = checker.generate_report(results)
    
    # Print to console
    print("\n" + "="*60)
    print(report)
    
    # Save to file
    with open("dead_links_report.md", "w") as f:
        f.write(report)
    
    print(f"\nReport saved to: dead_links_report.md")
    
    # Exit with error code if dead links found
    if results['total_dead_links'] > 0:
        sys.exit(1)
    else:
        print("\n✅ No dead links found!")
        sys.exit(0)


if __name__ == "__main__":
    main()