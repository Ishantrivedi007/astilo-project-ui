import * as Yup from "yup";

const passwordRegex = /^(?!.*\s)(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).*$/;
const phoneNumberRegex = /^[1-9]\d{9}$/;
const emailRegex = /^[A-Z0-9._%+-]+@[A-Z.-]+\.[A-Z]{2,}$/i;
const onlyDigits = /^\d+$/;
const nameRegex = /^[a-zA-ZÀ-ÿ-.' ]*$/;

export const LoginSchema = Yup.object().shape({
  userEmail: Yup.string()
    .trim()
    .matches(emailRegex, "Please enter a valid email.")
    .required("Email is required"),
  // .test(
  //   "valid-email",
  //   "Invalid email format",
  //   (value) =>
  //     value?.split("@").length === 2 &&
  //     value?.split("@")[1]?.split(".").length === 2
  // ),

  password: Yup.string()
    .trim()
    .required("Required")
    .min(8, "Password is too short - should be 8 chars minimum.")
    .max(20, "Password is too long - should be 20 chars maximum.")
    .matches(
      passwordRegex,
      "Password should contain at least one uppercase letter, one digit, one special character and no spaces."
    ),
});
