import Razorpay from "razorpay";

const getRazorpay = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return null;
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

export default getRazorpay;