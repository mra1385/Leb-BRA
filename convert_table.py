import sys
from docx import Document
from docx.opc.exceptions import PackageNotFoundError

def convert_docx_table_to_html(docx_filename="comparison.docx", output_html_filename="table_content.html"):
    """Reads the first table from a .docx file and saves its HTML <table> representation to a file."""
    try:
        document = Document(docx_filename)
    except PackageNotFoundError:
        print(f"Error: File '{docx_filename}' not found or is not a valid Word document.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred opening the file: {e}", file=sys.stderr)
        sys.exit(1)

    if not document.tables:
        print(f"Error: No tables found in the document '{docx_filename}'.", file=sys.stderr)
        sys.exit(1)

    # Assuming the first table is the one we want
    table = document.tables[0]

    # Start with the table tag
    html_table = "<table>\n"
    html_thead = "  <thead>\n"
    html_tbody = "  <tbody>\n"

    is_first_row = True
    for i, row in enumerate(table.rows):
        row_html = "    <tr>\n"
        tag = "th" if is_first_row else "td"
        for cell in row.cells:
            # Replace newline characters within a cell with <br> for HTML
            # Also escape basic HTML characters just in case
            cell_text = cell.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            cell_text = cell_text.replace('\n', '<br>').replace('\r', '')
            row_html += f"      <{tag}>{cell_text}</{tag}>\n"
        row_html += "    </tr>\n"

        if is_first_row:
            html_thead += row_html
            html_thead += "  </thead>\n" # Close thead after the first row
        else:
            html_tbody += row_html

        is_first_row = False

    html_tbody += "  </tbody>\n" # Close tbody after all data rows
    html_table += html_thead
    html_table += html_tbody
    html_table += "</table>" # Close the table tag

    # Write the HTML table block to the specified output file
    try:
        with open(output_html_filename, 'w', encoding='utf-8') as f:
            f.write(html_table)
        print(f"Successfully converted table to {output_html_filename}")
    except IOError as e:
        print(f"Error writing to file {output_html_filename}: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred writing the file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    convert_docx_table_to_html() # Using default filenames 