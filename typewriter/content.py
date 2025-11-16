import requests
import json
import os

NOTION_TOKEN = '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'
NOTION_PAGE_ID = '1a1f3868d02e800d9e24ffab2ec974db'
TEST_MODE = False  # Global test mode flag

def fetch_notion_content():
    """Fetch content from Notion API and return formatted statements"""
    url = f"https://api.notion.com/v1/blocks/{NOTION_PAGE_ID}/children"
    
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    # Map Notion colors to CSS classes
    COLOR_TO_CLASS = {
        'default': None,
        'gray_background': 'gray',
        'brown_background': 'brown',
        'orange_background': 'orange',
        'yellow_background': 'yellow',
        'green_background': 'green',
        'blue_background': 'blue',
        'purple_background': 'purple',
        'pink_background': 'pink',
        'red_background': 'red',
        # Add text colors as well
        'gray': 'text-gray',
        'brown': 'text-brown',
        'orange': 'text-orange',
        'yellow': 'text-yellow',
        'green': 'text-green',
        'blue': 'text-blue',
        'purple': 'text-purple',
        'pink': 'text-pink',
        'red': 'text-red'
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        statements = []
        for block in data['results']:
            if block['type'] == 'paragraph' and block['paragraph']['rich_text']:
                rich_text_parts = []
                for text in block['paragraph']['rich_text']:
                    bg_color = text['annotations'].get('background_color', 'default')
                    text_color = text['annotations'].get('color', 'default')
                    
                    css_class = None
                    if bg_color != 'default':
                        css_class = COLOR_TO_CLASS.get(bg_color)
                    elif text_color != 'default':
                        css_class = COLOR_TO_CLASS.get(text_color)
                    
                    # Handle links
                    if text.get('href'):
                        # Extract the actual Notion page ID from the link
                        page_id = text['href']
                        print(f"Debug - Processing link: {text['plain_text']} with href: {page_id}")  # Debug print
                        
                        # Only process valid page IDs
                        if page_id != "Error":
                            page_info = get_page_info(page_id)
                            if css_class:
                                rich_text_parts.append(f'<a href="{page_info["url"]}" class="notion-link {css_class}">{text["plain_text"]}</a>')
                            else:
                                rich_text_parts.append(f'<a href="{page_info["url"]}" class="notion-link">{text["plain_text"]}</a>')
                        else:
                            rich_text_parts.append(text['plain_text'])
                    else:
                        if css_class:
                            rich_text_parts.append(f'<span class="{css_class}">{text["plain_text"]}</span>')
                        else:
                            rich_text_parts.append(text['plain_text'])
                
                statement = ''.join(rich_text_parts).strip()
                if statement:
                    statements.append(statement)
        
        return statements

    except requests.exceptions.RequestException as e:
        print(f"Error fetching Notion content: {e}")
        return []

def save_to_file(statements, filename='content.txt'):
    """Save statements to a text file"""
    try:
        # Get the directory where the script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Create the full path for content.txt
        file_path = os.path.join(script_dir, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(statements))
        print(f"Content successfully saved to {file_path}")
    except IOError as e:
        print(f"Error saving to file: {e}")

def get_page_info(page_id):
    """Fetch page title and URL from Notion API"""
    # Remove any leading/trailing slashes from page_id
    page_id = page_id.strip('/')
    
    url = f"https://api.notion.com/v1/pages/{page_id}"
    print(f"Debug - Fetching page info for ID: {page_id}")  # Debug print
    
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Get page title from properties
        title = ""
        if "properties" in data:
            title_prop = data["properties"].get("title") or data["properties"].get("Name")
            if title_prop and "title" in title_prop and len(title_prop["title"]) > 0:
                title = title_prop["title"][0]["plain_text"]
        
        # Build echoes.paris URL from title
        # Special case for "computational design"
        if "computational design" in title.lower():
            url_title = "computational-design-cd"
        else:
            url_title = title.lower().replace(' ', '-')
        
        echoes_url = f"https://echoes.paris/tags/{url_title}"
        
        print(f"Debug - Found title: {title}")  # Debug print
        print(f"Debug - Generated URL: {echoes_url}")  # Debug print
        
        return {
            "title": title,
            "url": echoes_url
        }
    except Exception as e:
        print(f"Error fetching page info: {e}")
        return {"title": "Unknown", "url": "Error"}

def main(test_mode=TEST_MODE):
    """Main function to fetch content and save to file"""
    print("Fetching content from Notion...")
    statements = fetch_notion_content()
    
    if statements:
        print(f"\nFound {len(statements)} statements")
        
        if test_mode:
            print("\n=== TEST MODE: CONTENT PREVIEW ===")
            for i, statement in enumerate(statements, 1):
                print(f"\nStatement {i}:")
                print(f"Raw: {statement}")
                
                # Print any links found in this statement
                print("Links in this statement:")
                start = 0
                while True:
                    link_start = statement.find('<a href="', start)
                    if link_start == -1:
                        break
                        
                    href_start = link_start + 9
                    href_end = statement.find('"', href_start)
                    text_start = statement.find('>', href_end) + 1
                    text_end = statement.find('</a>', text_start)
                    
                    link_href = statement[href_start:href_end]
                    link_text = statement[text_start:text_end]
                    
                    print(f"- Link Text: {link_text}")
                    print(f"  URL: {link_href}")
                    
                    start = text_end
                
                # Print any spans (highlighted text) in this statement
                print("Highlighted text in this statement:")
                start = 0
                while True:
                    span_start = statement.find('<span class="', start)
                    if span_start == -1:
                        break
                    
                    class_start = span_start + 13
                    class_end = statement.find('">', class_start)
                    text_start = class_end + 2
                    text_end = statement.find('</span>', text_start)
                    
                    span_class = statement[class_start:class_end]
                    span_text = statement[text_start:text_end]
                    
                    print(f"- Text: {span_text}")
                    print(f"  Class: {span_class}")
                    
                    start = text_end
                
                print("-" * 50)
            
            save_choice = input("\nDo you want to save this content to file? (y/n): ")
            if save_choice.lower() != 'y':
                print("Content not saved.")
                return
        
        print("\nSaving content to file...")
        save_to_file(statements)
        print("Content saved successfully!")
    else:
        print("No content found or error occurred")

if __name__ == "__main__":
    main(test_mode=True)  # Set test_mode=False to skip preview