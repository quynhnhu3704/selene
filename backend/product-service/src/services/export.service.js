// backend/product-service/src/services/export.service.js
import { supabase } from "../configs/supabase.js";
import ExcelJS from "exceljs";

export const generateProductsExcelBuffer = async () => {
  // 1. Lấy tổng số lượng sản phẩm từ DB
  const { count: totalProducts, error: countError } = await supabase
    .from("products")
    .select("product_id", { count: "exact", head: true });

  if (countError) {
    console.error("Lỗi khi đếm số lượng sản phẩm:", countError.message);
    throw new Error(`Lỗi cơ sở dữ liệu khi xuất Excel: ${countError.message}`);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");

  // Cấu hình cột Excel (chỉ set width và key)
  worksheet.columns = [
    { key: "product_id", width: 25 },
    { key: "variant_id", width: 25 },
    { key: "product_name", width: 35 },
    { key: "category_name", width: 20 },
    { key: "brand_name", width: 20 },
    { key: "original_price", width: 15 },
    { key: "price", width: 15 },
    { key: "discount_price", width: 15 },
    { key: "size", width: 10 },
    { key: "color", width: 15 },
    { key: "stock_quantity", width: 15 },
    { key: "status", width: 15 },
  ];

  // 2. Thiết lập tiêu đề (Header Section) ở các dòng trên
  // Dòng 2: Tên cửa hàng SELENE SHOP
  worksheet.mergeCells("A2:L2");
  const brandCell = worksheet.getCell("A2");
  brandCell.value = "SELENE SHOP";
  brandCell.font = {
    name: "Segoe UI",
    size: 16,
    bold: true,
    color: { argb: "1F4E79" }, // Màu xanh navy đậm sang trọng
  };
  brandCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 30;

  // Dòng 3: Tên báo cáo DANH SÁCH SẢN PHẨM
  worksheet.mergeCells("A3:L3");
  const titleCell = worksheet.getCell("A3");
  titleCell.value = "DANH SÁCH SẢN PHẨM";
  titleCell.font = {
    name: "Segoe UI",
    size: 13,
    bold: true,
    color: { argb: "333333" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(3).height = 25;

  // Định dạng ngày hiện tại dạng DD/MM/YYYY
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  // Dòng 4: Ngày xuất
  worksheet.mergeCells("A4:L4");
  const dateCell = worksheet.getCell("A4");
  dateCell.value = `Ngày xuất: ${dateStr}`;
  dateCell.font = {
    name: "Segoe UI",
    size: 10,
    italic: true,
    color: { argb: "555555" },
  };
  dateCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(4).height = 20;

  // Dòng 5: Tổng số sản phẩm
  worksheet.mergeCells("A5:L5");
  const totalCell = worksheet.getCell("A5");
  totalCell.value = `Tổng số sản phẩm: ${totalProducts || 0}`;
  totalCell.font = {
    name: "Segoe UI",
    size: 10,
    bold: true,
    color: { argb: "555555" },
  };
  totalCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(5).height = 20;

  // Dòng 6: Dòng trống tạo khoảng cách
  worksheet.getRow(6).height = 15;

  // Dòng 7: Dòng tiêu đề bảng (Table Header)
  const headerRow = worksheet.getRow(7);
  headerRow.values = [
    "Mã sản phẩm",
    "Mã biến thể",
    "Tên sản phẩm",
    "Danh mục",
    "Thương hiệu",
    "Giá gốc",
    "Giá bán",
    "Giá sau giảm",
    "Size",
    "Màu",
    "Tồn kho",
    "Trạng thái",
  ];
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Segoe UI",
      size: 11,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "365F91" }, // Màu xanh xám cổ điển chuyên nghiệp
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "365F91" } },
      bottom: { style: "medium", color: { argb: "365F91" } },
      left: { style: "thin", color: { argb: "B0C4DE" } },
      right: { style: "thin", color: { argb: "B0C4DE" } },
    };
  });

  // Freeze tiêu đề và bật Auto Filter (ở dòng 7)
  worksheet.views = [{ state: "frozen", ySplit: 7 }];
  worksheet.autoFilter = "A7:L7";

  let page = 1;
  const limit = 100;
  let hasMore = true;
  let currentRowNum = 8; // Bắt đầu ghi dữ liệu từ dòng 8
  let productIndex = 0; // Để đổi màu nền xen kẽ

  while (hasMore) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Lấy dữ liệu từ bảng products cùng categories, brands và product_variants
    const { data: products, error } = await supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        original_price,
        price,
        discount_price,
        status,
        categories: category_id (
          name
        ),
        brands: brand_id (
          name
        ),
        product_variants (
          variant_id,
          size,
          color,
          stock_quantity,
          status
        )
      `,
      )
      .order("created_at", { ascending: false })
      .order("product_id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(
        "Lỗi truy vấn Supabase trong export service:",
        error.message,
      );
      throw new Error(`Lỗi cơ sở dữ liệu khi xuất Excel: ${error.message}`);
    }

    if (!products || products.length === 0) {
      hasMore = false;
      break;
    }

    for (const product of products) {
      const variants = product.product_variants || [];
      const numVariants = variants.length;

      // Màu nền xen kẽ nhẹ giữa các sản phẩm để dễ phân biệt
      const isEven = productIndex % 2 === 0;
      const rowBgColor = isEven ? "FFFFFF" : "F2F5F8";
      productIndex++;

      // Trường hợp sản phẩm không có biến thể
      if (numVariants === 0) {
        const rowData = {
          product_id: product.product_id,
          variant_id: "",
          product_name: product.product_name,
          category_name: product.categories?.name || "",
          brand_name: product.brands?.name || "",
          original_price: product.original_price,
          price: product.price,
          discount_price: product.discount_price,
          size: "",
          color: "",
          stock_quantity: 0,
          status: product.status === "active" ? "Hoạt động" : "Đã khóa",
        };

        const row = worksheet.addRow(rowData);
        row.height = 22;
        styleRowCells(row, rowBgColor, true);
        currentRowNum++;
      } else {
        // Ghi danh sách các biến thể
        const startRow = currentRowNum;
        for (let i = 0; i < numVariants; i++) {
          const v = variants[i];
          const isFirstRow = i === 0;

          let variantStatusStr = "Hoạt động";
          if (v.status === "inactive" || v.status === "archived") {
            variantStatusStr = "Đã khóa";
          }

          const rowData = {
            product_id: isFirstRow ? product.product_id : "",
            variant_id: v.variant_id || "",
            product_name: isFirstRow ? product.product_name : "",
            category_name: isFirstRow ? product.categories?.name || "" : "",
            brand_name: isFirstRow ? product.brands?.name || "" : "",
            original_price: isFirstRow ? product.original_price : null,
            price: isFirstRow ? product.price : null,
            discount_price: isFirstRow ? product.discount_price : null,
            size: v.size || "",
            color: v.color || "",
            stock_quantity: v.stock_quantity || 0,
            status: variantStatusStr,
          };

          const row = worksheet.addRow(rowData);
          row.height = 22;

          const isLastRow = i === numVariants - 1;
          styleRowCells(row, rowBgColor, isLastRow);
          currentRowNum++;
        }

        // Merge ô thuộc tính chung của sản phẩm
        if (numVariants > 1) {
          worksheet.mergeCells(startRow, 1, startRow + numVariants - 1, 1); // Mã sản phẩm
          worksheet.mergeCells(startRow, 3, startRow + numVariants - 1, 3); // Tên sản phẩm
          worksheet.mergeCells(startRow, 4, startRow + numVariants - 1, 4); // Danh mục
          worksheet.mergeCells(startRow, 5, startRow + numVariants - 1, 5); // Thương hiệu
          worksheet.mergeCells(startRow, 6, startRow + numVariants - 1, 6); // Giá gốc
          worksheet.mergeCells(startRow, 7, startRow + numVariants - 1, 7); // Giá bán
          worksheet.mergeCells(startRow, 8, startRow + numVariants - 1, 8); // Giá sau giảm

          // ExcelJS merge đôi khi làm mất định dạng căn lề, áp dụng lại căn lề cho dòng đầu tiên
          const leftAlignCols = [1, 3, 4, 5];
          const rightAlignCols = [6, 7, 8];

          leftAlignCols.forEach((col) => {
            const firstCell = worksheet.getCell(startRow, col);
            firstCell.alignment = {
              vertical: "middle",
              horizontal: "left",
              wrapText: true,
            };
          });

          rightAlignCols.forEach((col) => {
            const firstCell = worksheet.getCell(startRow, col);
            firstCell.alignment = {
              vertical: "middle",
              horizontal: "right",
            };
          });
        }
      }
    }

    if (products.length < limit) {
      hasMore = false;
    } else {
      page++;
    }
  }

  // Hàm phụ định dạng styles cho tất cả ô của dòng dữ liệu
  function styleRowCells(row, bgColor, isLastRow) {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Font chữ
      cell.font = {
        name: "Segoe UI",
        size: 10,
        color: { argb: "000000" },
      };

      // Màu nền solid (xen kẽ nhóm sản phẩm)
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };

      // Căn lề tùy theo loại dữ liệu của cột
      if ([1, 2, 3, 4, 5].includes(colNumber)) {
        // Cột mã sản phẩm, mã biến thể, tên sản phẩm, danh mục, thương hiệu
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
      } else if ([9, 10, 11, 12].includes(colNumber)) {
        // Cột size, màu, tồn kho, trạng thái biến thể
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      } else if ([6, 7, 8].includes(colNumber)) {
        // Cột giá tiền
        cell.alignment = {
          vertical: "middle",
          horizontal: "right",
        };
        cell.numFmt = "#,##0"; // Định dạng phân tách hàng nghìn
      }

      // Viền ô (borders)
      cell.border = {
        top: { style: "thin", color: { argb: "E0E0E0" } },
        left: { style: "thin", color: { argb: "E0E0E0" } },
        right: { style: "thin", color: { argb: "E0E0E0" } },
        bottom: {
          style: isLastRow ? "medium" : "thin", // Dòng cuối cùng của nhóm sản phẩm có viền dưới đậm hơn
          color: { argb: isLastRow ? "A0A0A0" : "E0E0E0" },
        },
      };
    });
  }

  // Tự động điều chỉnh độ rộng cột dựa trên nội dung dài nhất
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      // Chỉ tính toán chiều rộng dựa trên các ô thuộc về bảng dữ liệu (dòng 7 trở đi)
      if (
        cell.row >= 7 &&
        cell.value &&
        (!cell.master || cell === cell.master)
      ) {
        let valueStr = "";
        if (cell.numFmt && typeof cell.value === "number") {
          valueStr = cell.value.toLocaleString("vi-VN");
        } else {
          valueStr = cell.value.toString();
        }
        maxLen = Math.max(maxLen, valueStr.length);
      }
    });
    column.width = Math.max(maxLen + 4, 12); // Tối thiểu rộng 12
  });

  return await workbook.xlsx.writeBuffer();
};
