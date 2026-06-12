# scripts\scraping\crawl_products.py
import json
import time
import pandas as pd

from sources.nem_scraper import (CATEGORIES, get_product_links, scrape_product)

MAX_PAGE = 3
products = []
visited_links = set()

for category_name, collection_url in CATEGORIES.items():

    print(f"\n========== {category_name} ==========")

    for page in range(1, MAX_PAGE + 1):
        
        print(f"\n========== PAGE {page} ==========")
        try:
            links = get_product_links(category_name, collection_url, page)
            print(f"Found {len(links)} products")

            for index, item in enumerate(links, start=1):
                link = item["url"]

                if link in visited_links:
                    continue
                visited_links.add(link)

                try:
                    print(
                        f"[{index}/{len(links)}] "
                        f"Scraping: {link}"
                    )
                    product = scrape_product(link, item["category"])
                    products.append(product)
                    time.sleep(1)
                
                except Exception as e:
                    print(f"Product Error: {e}")

        except Exception as e:
            print(f"Page Error: {e}")

print(f"\nTotal products: {len(products)}")

with open("output/products_raw.json", "w", encoding="utf-8") as file:
    json.dump(products, file, ensure_ascii=False, indent=4)

df = pd.DataFrame(products)
df.to_csv("output/products_raw.csv", index=False, encoding="utf-8-sig")

print("\nDone!")

# Chạy: python crawl_products.py