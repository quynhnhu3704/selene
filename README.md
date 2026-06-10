```
selene/
│
├── frontend/                            # ReactJS
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── styles/
│   │   │
│   │   ├── components/
│   │   │
│   │   ├── layouts/
│   │   │
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Product/
│   │   │   ├── Cart/
│   │   │   ├── Checkout/
│   │   │   ├── Profile/
│   │   │   └── Admin/
│   │   │
│   │   ├── services/
│   │   │
│   │   ├── hooks/
│   │   │
│   │   ├── context/
│   │   │
│   │   ├── routes/
│   │   │
│   │   ├── utils/
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
│
├── backend/
│   │
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middlewares/
│   │   │   └── server.js
│   │   │
│   │   ├── package.json
│   │   └── .env
│   │
│   │
│   ├── services/
│   │
│   │   ├── auth-service/
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── models/
│   │   │   │   ├── routes/
│   │   │   │   ├── middlewares/
│   │   │   │   ├── utils/
│   │   │   │   └── server.js
│   │   │   │
│   │   │   ├── package.json
│   │   │   └── .env
│   │   │
│   │   │
│   │   ├── product-service/
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── models/
│   │   │   │   ├── routes/
│   │   │   │   ├── middlewares/
│   │   │   │   ├── utils/
│   │   │   │   └── server.js
│   │   │   │
│   │   │   ├── package.json
│   │   │   └── .env
│   │   │
│   │   │
│   │   ├── order-service/
│   │   │   ├── src/
│   │   │   └── ...
│   │   │
│   │   ├── user-service/
│   │   │   ├── src/
│   │   │   └── ...
│   │   │
│   │   ├── review-service/
│   │   │   ├── src/
│   │   │   └── ...
│   │   │
│   │   └── notification-service/
│   │       ├── src/
│   │       └── ...
│   │
│   └── shared/
│       ├── constants/
│       ├── utils/
│       └── configs/
│
│
├── scripts/
│   └── scraping/
│       │
│       ├── spiders/
│       │   ├── yody_spider.py
│       │   ├── routine_spider.py
│       │   ├── coolmate_spider.py
│       │   └── ivymoda_spider.py
│       │
│       ├── output/
│       │   ├── products.json
│       │   └── categories.json
│       │
│       ├── scrape_products.py
│       ├── requirements.txt
│       └── README.md
│
│
├── database/
│   ├── mongodb/
│   │   ├── seed/
│   │   └── backup/
│   │
│   └── erd/
│
│
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── uml/
│   ├── testcases/
│   └── reports/
│
│
├── docker/
│   ├── frontend/
│   ├── backend/
│   └── mongodb/
│
│
├── .gitignore
├── docker-compose.yml
├── README.md
└── package.json
```
