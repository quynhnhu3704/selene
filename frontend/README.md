Dưới đây là cấu trúc frontend React (chuẩn doanh nghiệp, dùng với Node.js microservices + API Gateway). Mục tiêu: dễ scale, dễ tách service, dễ maintain.

---

# 1. Cấu trúc chuẩn (React + Microservices backend)

```text id="f1"
frontend/
│
├── public/
│
├── src/
│   ├── app/                  # app bootstrap
│   │   ├── store/           # redux/zustand store
│   │   ├── router/          # route config
│   │   └── providers/       # auth, theme, query provider
│   │
│   ├── assets/              # images, icons, fonts
│   │
│   ├── components/         # UI components dùng lại (button, modal)
│   │
│   ├── features/           # business logic theo module
│   │   ├── auth/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── order/
│   │   └── user/
│   │
│   ├── pages/              # page-level components
│   │   ├── Home/
│   │   ├── ProductDetail/
│   │   ├── ProductList/
│   │   ├── Cart/
│   │   └── Login/
│   │
│   ├── services/          # API layer (quan trọng nhất)
│   │   ├── http.js        # axios instance
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── order.service.js
│   │   └── user.service.js
│   │
│   ├── hooks/             # custom hooks
│   │
│   ├── utils/             # helper functions
│   │
│   ├── constants/         # constant (API routes, config)
│   │
│   ├── styles/            # global css / tailwind config
│   │
│   ├── mock/              # mock data (khi backend chưa có)
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env
├── package.json
└── vite.config.js / webpack.config.js
```

---

# 2. Điểm quan trọng (chuẩn doanh nghiệp)

## (1) services/ = gateway gọi backend

Ví dụ:

```js id="s1"
export const getProducts = () =>
  http.get("/products");
```

👉 `/products` thực tế đi qua API Gateway

---

## (2) features/ = business logic

Không viết logic trong pages.

Ví dụ:

```text id="s2"
features/product/
  productSlice.js
  productThunk.js
  productApi.js
```

---

## (3) pages/ = chỉ render UI

```text id="s3"
pages/ProductList/index.jsx
```

👉 KHÔNG chứa logic API phức tạp

---

## (4) app/router = định tuyến tập trung

```js id="s4"
<Route path="/products" element={<ProductList />} />
```

---

## (5) services/http.js (rất quan trọng)

```js id="s5"
import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true
});

export default http;
```

---

# 3. Mapping với microservices backend của bạn

```text id="m1"
frontend → API Gateway (8000)
                ├── auth-service (8001)
                ├── product-service (8002)
                ├── order-service (8003)
                └── user-service (8004)
```

Frontend KHÔNG gọi trực tiếp service → chỉ gọi gateway.

---

# 4. Pattern chuẩn ngành dùng

## Option A (phổ biến nhất)

* Feature-based structure (ở trên)
* Redux Toolkit / Zustand
* Axios + service layer

## Option B (enterprise lớn hơn)

* Clean Architecture frontend
* domain / application / infrastructure split

---

# 5. Quy tắc quan trọng

* ❌ Không gọi API trong component UI
* ❌ Không nhét logic vào pages
* ❌ Không hardcode URL backend trong component
* ✔ Tất cả API đi qua services/

---

Nếu muốn, tôi có thể:

* dựng skeleton React hoàn chỉnh cho bạn (copy chạy luôn)
* hoặc map luôn UI ecommerce (product/cart/order flow) theo backend microservice bạn đang làm.
