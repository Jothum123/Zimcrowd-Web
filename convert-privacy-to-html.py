#!/usr/bin/env python3
"""
Privacy Policy Text to HTML Converter
Converts the expanded privacy policy text into properly formatted HTML
"""

import re

def convert_to_html(text_content):
    """Convert text content to HTML with proper formatting"""
    
    html_parts = []
    lines = text_content.split('\n')
    
    in_list = False
    in_table = False
    table_headers = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        if not line:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            continue
        
        # Headers
        if line.startswith('SECTION ') and ':' in line:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            section_num = line.split(':')[0].replace('SECTION ', '')
            section_title = line.split(':', 1)[1].strip()
            html_parts.append(f'\n<h2 id="section{section_num}">{section_num}. {section_title}</h2>')
        
        # Subsections (e.g., "1.1 Information You Provide Directly")
        elif re.match(r'^\d+\.\d+\s+', line):
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h3>{line}</h3>')
        
        # Sub-subsections (e.g., "Personal Identification:")
        elif line.endswith(':') and len(line) < 100:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h4>{line[:-1]}</h4>')
        
        # Info boxes
        elif 'Info Box:' in line or 'Data Controller Information Box:' in line:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append('<div class="info-box">')
            html_parts.append(f'<h3>{line.replace("Info Box:", "").replace("Data Controller Information Box:", "").strip()}</h3>')
        
        # Warning boxes
        elif 'WARNING' in line.upper() or 'Warning Box:' in line:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append('<div class="warning-box">')
            html_parts.append(f'<p><strong>{line}</strong></p>')
        
        # Close boxes
        elif line.startswith('Note:') and html_parts and 'box">' in html_parts[-2]:
            html_parts.append(f'<p><em>{line}</em></p>')
            html_parts.append('</div>')
        
        # List items (lines starting with -)
        elif line.startswith('-') or line.startswith('•'):
            if not in_list:
                html_parts.append('<ul>')
                in_list = True
            item_text = line[1:].strip()
            # Check for bold text (text before colon)
            if ':' in item_text:
                parts = item_text.split(':', 1)
                html_parts.append(f'<li><strong>{parts[0]}:</strong>{parts[1]}</li>')
            else:
                html_parts.append(f'<li>{item_text}</li>')
        
        # Table detection (lines with | separators)
        elif '|' in line and line.count('|') >= 2:
            if not in_table:
                html_parts.append('<table>')
                in_table = True
                # This is the header row
                cells = [cell.strip() for cell in line.split('|') if cell.strip()]
                table_headers = cells
                html_parts.append('<tr>')
                for cell in cells:
                    html_parts.append(f'<th>{cell}</th>')
                html_parts.append('</tr>')
            elif line.startswith('|---'):
                # Skip separator line
                continue
            else:
                # Data row
                cells = [cell.strip() for cell in line.split('|') if cell.strip()]
                html_parts.append('<tr>')
                for cell in cells:
                    html_parts.append(f'<td>{cell}</td>')
                html_parts.append('</tr>')
        else:
            # Regular paragraph
            if in_table and '|' not in line:
                html_parts.append('</table>')
                in_table = False
            if in_list and not line.startswith('-'):
                html_parts.append('</ul>')
                in_list = False
            
            # Check for bold text
            if line.startswith('**') and line.endswith('**'):
                html_parts.append(f'<p><strong>{line[2:-2]}</strong></p>')
            elif 'Rights:' in line or 'How to Exercise:' in line:
                html_parts.append(f'<h3>{line}</h3>')
            else:
                html_parts.append(f'<p>{line}</p>')
    
    # Close any open tags
    if in_list:
        html_parts.append('</ul>')
    if in_table:
        html_parts.append('</table>')
    
    return '\n'.join(html_parts)


# Instructions for use
print("""
Privacy Policy HTML Converter
==============================

INSTRUCTIONS:
1. Save your expanded privacy policy text to 'expanded-content.txt'
2. Run this script: python convert-privacy-to-html.py
3. Output will be saved to 'privacy-content-formatted.html'
4. Copy the content and replace lines 260-349 in privacy-policy.html

The script will automatically:
- Convert headers to <h2>, <h3>, <h4>
- Convert lists to <ul><li>
- Create info-box and warning-box divs
- Format tables with proper HTML
- Add proper paragraph tags

Ready to convert!
""")

# Example usage
if __name__ == "__main__":
    try:
        with open('expanded-content.txt', 'r', encoding='utf-8') as f:
            content = f.read()
        
        html_content = convert_to_html(content)
        
        with open('privacy-content-formatted.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print("✅ Conversion complete!")
        print("📄 Output saved to: privacy-content-formatted.html")
        print("\nNext steps:")
        print("1. Review the formatted HTML")
        print("2. Copy the content")
        print("3. Replace lines 260-349 in privacy-policy.html")
        
    except FileNotFoundError:
        print("❌ Error: 'expanded-content.txt' not found")
        print("Please create this file with your expanded privacy policy content")
    except Exception as e:
        print(f"❌ Error: {e}")
