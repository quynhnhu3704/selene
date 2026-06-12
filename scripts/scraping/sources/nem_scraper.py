# scripts\scraping\sources\nem_scraper.py
import time
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://nemshop.vn"

CATEGORIES = {
    "Đầm": "https://nemshop.vn/collections/dam",
    "Áo sơ mi": "https://nemshop.vn/collections/ao-so-mi",
    "Quần": "https://nemshop.vn/collections/quan-dai",
    "Chân váy": "https://nemshop.vn/collections/chan-vay-dang-a",
    "Set bộ": "https://nemshop.vn/collections/do-bo",
    "Jumpsuit": "https://nemshop.vn/collections/jumpsuit",
    "Áo dài": "https://nemshop.vn/collections/ao-dai",
    "Áo khoác": "https://nemshop.vn/collections/ao-khoac-1"
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/137.0.0.0 Safari/537.36"
    )
}

session = requests.Session()
session.headers.update(HEADERS)

def get_page_url(collection_url, page):

    if page == 1:
        return collection_url

    return f"{collection_url}?page={page}"

def get_soup(url):
    response = session.get(url, timeout=30)
    response.raise_for_status()

    return BeautifulSoup(response.text, "html.parser")

def get_product_links(category_name, collection_url, page):
    url = get_page_url(collection_url, page)
    soup = get_soup(url)
    links = []

    product_cards = soup.select(".product-item") # selector card sản phẩm

    for card in product_cards:
        link_tag = card.select_one(".product-title a") # selector link sản phẩm

        if not link_tag:
            continue

        href = link_tag.get("href")

        if not href:
            continue

        if href.startswith("/"):
            href = (BASE_URL + href)

        links.append({
            "url": href,
            "category": category_name
        })
    return links


def scrape_product(product_url, category):
    soup = get_soup(product_url)

    product = {
        "product_id": "",
        "product_name": "",
        "brand": "NEM",
        "category": category,
        "price": 0,
        "original_price": 0,
        "sizes": [],
        "colors": [],
        "image_urls": [],
        "product_url": product_url,
        "description": ""
    }

    # =========================

    try:
        element = soup.select_one(".name-title") # PRODUCT NAME
        if element:
            product["product_name"] = (element.get_text(strip=True))
    except Exception:
        pass
    
    # =========================

    try:
        element = soup.select_one(".sku-number") # PRODUCT ID
        if element:
            product["product_id"] = (element.get_text(strip=True))
    except Exception:
        pass

    # ==================================

    try:
        element = soup.select_one(".current-price") # PRICE
        if element:
            product["price"] = (element.get_text(strip=True))
    except Exception:
        pass

    # try:
    #     element = soup.select_one("YOUR_PRICE_SELECTOR")

    #     if element:
    #         price_text = element.get_text(strip=True)

    #         price = int(
    #             price_text
    #             .replace("₫", "")
    #             .replace(",", "")
    #             .replace(".", "")
    #             .strip()
    #         )

    #         product["price"] = price

    # except Exception:
    #     pass

    # ==================================

    try:
        element = soup.select_one(".original-price") # ORIGINAL PRICE
        if element:
            product["original_price"] = (element.get_text(strip=True))
    except Exception:
        pass

    # ==================================

    # try:
    #     size_elements = soup.select("YOUR_SIZE_SELECTOR") # SIZES

    #     product["sizes"] = [
    #         item.get_text(strip=True)
    #         for item in size_elements
    #     ]

    # except Exception:
    #     pass

    try:
        size_elements = soup.select(
            "#variant-swatch-0 .swatch-element"
        )

        product["sizes"] = []

        for item in size_elements:

            size = item.get("data-value")

            if size:

                size = (
                    size.replace("&nbsp;", " ")
                    .replace("Size ", "")
                    .strip()
                )

                product["sizes"].append(size)

    except Exception:
        pass



    # ==================================
    # COLORS
    # ==================================

    try:
        color_elements = soup.select("YOUR_COLOR_SELECTOR")

        product["colors"] = [
            item.get_text(strip=True)
            for item in color_elements
        ]

    except Exception:
        pass

    # ==================================
    # IMAGE URL
    # ==================================

    try:
        image_elements = soup.select("YOUR_IMAGE_SELECTOR")
        images = []

        for image in image_elements:
            src = (image.get("src") or image.get("data-src"))

            if src:
                images.append(src)

        product["image_urls"] = images

    except Exception:
        pass

    # ==================================
    # DESCRIPTION
    # ==================================

    try:
        desc = soup.select_one("YOUR_DESCRIPTION_SELECTOR")

        if desc:
            product["description"] = (
                desc.get_text("\n", strip=True)
            )

    except Exception:
        pass

    return product


if __name__ == "__main__":
    test_url = ("https://nemshop.vn/products/cong-so-dai-tay-4162")
    product = scrape_product(test_url, "Áo khoác")
    print(product)

# if __name__ == "__main__":

#     # links = get_product_links("Quần", "https://nemshop.vn/collections/quan-dai", 1)
#     links = get_product_links("Áo sơ mi", "https://nemshop.vn/collections/ao-so-mi", 3)

#     print(f"Total: {len(links)}")

#     for item in links[:5]:
#         print(item)

# Chạy test: python sources/nem_scraper.py