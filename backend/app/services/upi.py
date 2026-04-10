"""UPI deep-link and QR code generation for payments via any UPI app.

Generates standard UPI intent URLs that work with:
- Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, etc.

The deep link opens the user's UPI app with pre-filled payment details.
The QR code encodes the same UPI URI for scanning.
"""
import io
import base64
from urllib.parse import quote
from ..config import UPI_MERCHANT_NAME, UPI_VPA

try:
    import qrcode
    HAS_QR = True
except ImportError:
    HAS_QR = False


def generate_upi_link(
    payee_upi: str,
    payee_name: str,
    amount: float,
    note: str = "",
    ref_id: str = "",
) -> str:
    """
    Generate a UPI deep link URI.
    Format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&tn=<Note>&tr=<RefID>&cu=INR
    """
    vpa = payee_upi or UPI_VPA
    name = quote(payee_name or UPI_MERCHANT_NAME)
    uri = f"upi://pay?pa={vpa}&pn={name}&am={amount:.2f}&cu=INR"
    if note:
        uri += f"&tn={quote(note)}"
    if ref_id:
        uri += f"&tr={ref_id}"
    return uri


def generate_upi_qr(
    payee_upi: str,
    payee_name: str,
    amount: float,
    note: str = "",
    ref_id: str = "",
) -> str:
    """
    Generate a QR code image (base64 PNG) for the UPI payment.
    Returns a data URI that can be displayed directly in <img> or Image component.
    """
    uri = generate_upi_link(payee_upi, payee_name, amount, note, ref_id)
    if not HAS_QR:
        return uri  # fallback: return the text URI

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


def generate_material_qr(material_id: str, material_name: str) -> str:
    """
    Generate a scannable QR code for a material item.
    Encodes a JSON-like string that the mobile app can parse.
    """
    data = f"BUILDPRO:MAT:{material_id}:{material_name}"
    if not HAS_QR:
        return data

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1B4D3E", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"
