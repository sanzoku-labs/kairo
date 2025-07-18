#!/usr/bin/env python3
"""
Script to check for broken anchor links in Kairo documentation
"""
import os
import re
from pathlib import Path

def header_to_anchor(header):
    """Convert a markdown header to VitePress anchor format"""
    # Remove markdown syntax
    clean_header = re.sub(r'^#+\s+', '', header)
    # Remove code blocks and other formatting
    clean_header = re.sub(r'`([^`]+)`', r'\1', clean_header)
    # Remove special characters that aren't part of the text
    clean_header = re.sub(r'[<>(){}[\]]', '', clean_header)
    # Convert to lowercase and replace spaces/special chars with hyphens
    anchor = clean_header.lower().strip()
    anchor = re.sub(r'[^a-z0-9]+', '-', anchor)
    anchor = re.sub(r'^-+|-+$', '', anchor)  # Remove leading/trailing hyphens
    return anchor

def extract_headers_from_file(file_path):
    """Extract all headers from a markdown file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    headers = []
    for line in content.split('\n'):
        if line.strip().startswith('#'):
            headers.append(line.strip())
    
    return headers

def check_anchor_links():
    """Check all anchor links in documentation"""
    docs_dir = Path("docs")
    broken_anchors = []
    
    # First, build a map of all available anchors
    anchor_map = {}
    for md_file in docs_dir.rglob("*.md"):
        headers = extract_headers_from_file(md_file)
        anchors = [header_to_anchor(h) for h in headers]
        
        # Convert file path to URL path
        url_path = '/' + str(md_file.relative_to(docs_dir)).replace('.md', '')
        anchor_map[url_path] = anchors
    
    # Check all anchor links
    for md_file in docs_dir.rglob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all anchor links
        link_pattern = r'\[([^\]]+)\]\(([^)]+#[^)]+)\)'
        matches = re.findall(link_pattern, content)
        
        for text, link in matches:
            # Skip external links
            if link.startswith('http://') or link.startswith('https://'):
                continue
            
            # Split link and anchor
            if '#' in link:
                link_path, anchor = link.split('#', 1)
                
                # Check if the file exists
                if link_path in anchor_map:
                    # Check if the anchor exists
                    if anchor not in anchor_map[link_path]:
                        broken_anchors.append({
                            'file': str(md_file),
                            'text': text,
                            'link': link,
                            'expected_anchor': anchor,
                            'available_anchors': anchor_map[link_path]
                        })
                else:
                    # File doesn't exist
                    broken_anchors.append({
                        'file': str(md_file),
                        'text': text,
                        'link': link,
                        'expected_anchor': anchor,
                        'available_anchors': []
                    })
    
    return broken_anchors

def main():
    print("🔍 Checking anchor links in Kairo documentation...")
    print("=" * 60)
    
    broken_anchors = check_anchor_links()
    
    if broken_anchors:
        print(f"❌ Found {len(broken_anchors)} broken anchor links:")
        for anchor in broken_anchors:
            print(f"  - File: {anchor['file']}")
            print(f"    Text: {anchor['text']}")
            print(f"    Link: {anchor['link']}")
            print(f"    Expected anchor: {anchor['expected_anchor']}")
            if anchor['available_anchors']:
                print(f"    Available anchors: {', '.join(anchor['available_anchors'])}")
            print()
    else:
        print("✅ All anchor links are valid!")
    
    return len(broken_anchors)

if __name__ == "__main__":
    exit(main())