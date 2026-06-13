# NEM Product Scraper

## 1. Tạo môi trường Python

Di chuyển vào thư mục:

```bash
cd scripts/scraping
```

Tạo virtual environment:

```bash
python -m venv env
```

Kích hoạt:

```bash
env\Scripts\activate
```

## 2. Cài thư viện

```bash
pip install requests beautifulsoup4 pandas
```

Lưu requirements:

```bash
pip freeze > requirements.txt
```

## Chạy

Chạy test:

```bash
python sources/nem_scraper.py
```

Chạy crawler:

```bash
python crawl_products.py
```

## Cấu trúc thư mục

```text
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
