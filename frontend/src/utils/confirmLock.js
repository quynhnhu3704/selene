import Swal from "sweetalert2";

export default async function confirmLock(title, text) {
  const result = await Swal.fire({
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Khóa",
    cancelButtonText: "Hủy",
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    showIcon: false,
    customClass: {
      popup: "se-swal-popup",
      title: "se-swal-title",
      htmlContainer: "se-swal-text",
      confirmButton: "se-btn-confirm",
      cancelButton: "se-btn-cancel",
      actions: "se-swal-actions",
    },
  });

  return result.isConfirmed;
}
