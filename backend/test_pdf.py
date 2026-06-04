from services.document_processor import extract_text_from_pdf

text = extract_text_from_pdf(
    "sample_documents/sample.pdf"
)

print(text)