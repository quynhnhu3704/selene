1. Tạo môi trường Python
Di chuyển vào thư mục:
cd scripts/scraping
Tạo virtual environment:
python -m venv env
Kích hoạt:
env\Scripts\activate

2. Cài thư viện:
pip install requests beautifulsoup4 pandas
Lưu requirements:
pip freeze > requirements.txt


```
scripts/
└── scraping/
    │
    ├── sources/
    │   └── nem_scraper.py
    │
    ├── output/
    │   ├── products_raw.json
    │   ├── products_raw.csv
    │   ├── products_clean.json
    │   └── products_clean.csv
    │
    ├── crawl_products.py
    ├── clean_products.py
    ├── import_products.py
    │
    ├── requirements.txt
    └── README.md
```