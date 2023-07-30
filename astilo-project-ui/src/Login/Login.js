import React, { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Mail } from "./Mail";
import SharedButton from "../components/SharedButton";
import FormModal from "../components/SharedComponents/FormModal";
import InputField from "../components/SharedComponents/SharedInput/InputField";
import PasswordInput from "../components/SharedComponents/SharedInput/PasswordInput";
import { EyeIcon } from "../Navbar/EyeIcon";
import { UnLockIcon } from "./UnlockIcon";
import {
  Text,
  Row,
  Checkbox,
  Container,
  Link,
  Grid,
  Input,
} from "@nextui-org/react";
import { LoginSchema } from "../components/SharedComponents/Validations";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../redux/features/userSlice";
import SharedApiRequest from "../components/SharedComponents/SharedApiRequest";
import config from "../components/SharedComponents/config";
import { InputText } from "primereact/inputtext";

export default function Login() {
  const [visible, setVisible] = useState(false);
  const handler = () => setVisible(true);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const { data, loading, error, requestCall } = SharedApiRequest();
  const baseUrl = config.baseUrl;

  const closeHandler = () => {
    setVisible(false);
    console.log("closed");
  };

  const loginInitialValues = {
    userEmail: "",
    password: "",
  };
  const handleLogin = async (values) => {
    const userData = {
      userEmail: values.userEmail,
      password: values.password,
    };

    try {
      // Make the API call to your login endpoint
      const response = await requestCall(
        `${baseUrl}/users/login`,
        "POST",
        userData
      );

      // Assuming your API returns user data, dispatch it to update the Redux store
      dispatch(setUser(response.data));
      localStorage.setItem("useruserEmail", response.data?.userEmail);
      localStorage.setItem("userPassword", response.data?.password);
      closeHandler(); // Close the modal after successful login
    } catch (error) {
      // Handle error if login fails
      console.error("Login failed:", error);
      // You can set an error state or show an error message here if needed.
    }
  };

  return (
    <>
      <SharedButton
        auto
        shadow
        onPress={handler}
        color="gradient"
        title="Login"
        className="btn"
        buttonTextColor="white"
      />
      <Container
        justify="center"
        alignItems="center"
        direction="column"
        gap={2}
      >
        <FormModal
          open={visible}
          onClose={closeHandler}
          closeButton
          closeText="Cancel"
          secondButtonColor="gradient"
          secondButtonText="Login"
          onButtonClick={closeHandler}
          secondButtonClass="btn"
          width={440}

          // style={{ height: "400px" }}
        >
          <Formik
            initialValues={loginInitialValues}
            onSubmit={(values) => {
              console.log("formik", values);
              handleLogin(values);
            }}
            validationSchema={LoginSchema}
          >
            {({
              handleSubmit,
              handleChange,
              errors,
              values,
              touched,
              handleBlur,
              resetForm,
              isValid,
              dirty,
            }) => {
              const { userEmail, password } = values;
              return (
                <Form onSubmit={handleSubmit}>
                  <Grid.Container xs={12}>
                    <InputField
                      css={{
                        marginTop: "20px",
                      }}
                      name="userEmail"
                      placeholder="User Name"
                      color={
                        touched?.userEmail && errors?.userEmail
                          ? "error"
                          : "primary"
                      }
                      size="lg"
                      clearable
                      rounded
                      bordered
                      fullWidth
                      labelPlaceholder="Email"
                      contentLeft={<Mail fill="currentColor" />}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      value={userEmail}
                      helperColor={"error"}
                      helperText={touched?.userEmail && errors?.userEmail}
                    />
                  </Grid.Container>
                  <Grid.Container css={{ marginTop: "$10" }} xs={12}>
                    <PasswordInput
                      css={{ marginTop: "$10" }}
                      //className={"!mt-2"}
                      name="password"
                      placeholder="Password"
                      color={
                        touched?.password && errors?.password
                          ? "error"
                          : "primary"
                      }
                      size="lg"
                      clearable
                      rounded
                      bordered
                      fullWidth
                      labelPlaceholder="Password"
                      hideToggle={false}
                      contentLeft={<EyeIcon fill={"currentColor"} />}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      value={password}
                      helperColor={"error"}
                      helperText={touched?.password && errors?.password}
                    />
                  </Grid.Container>
                  <Grid.Container
                    css={{ marginTop: "$5" }}
                    gap={4}
                    justify="flex-end"
                    alignItems="center"
                  >
                    <SharedButton
                      css={{ marginRight: "$7" }}
                      auto={true}
                      flat={true}
                      shadow={false}
                      color={"error"}
                      buttonTextColor={"error"}
                      title={"Cancel"}
                      onPress={closeHandler}
                    />
                    <SharedButton
                      auto
                      shadow
                      color={"gradient"}
                      title={"Login"}
                      className={"btn"}
                      buttonTextColor={"white"}
                      type="submit"
                    />
                  </Grid.Container>
                </Form>
              );
            }}
          </Formik>
          <Grid.Container className="!py-3">
            <Grid xs={4}>
              <Checkbox css={{ marginLeft: "$1" }} />
              <Text size={14} css={{ marginLeft: "$4", top: "$3" }}>
                Remember me
              </Text>
            </Grid>
            <Grid xs={4}></Grid>
            <Grid xs={4} justify="flex-end">
              <Text size={14}>
                <Link href="/" color="primary" css={{ marginRight: "$2" }}>
                  Forgot Password?
                </Link>
              </Text>
            </Grid>
          </Grid.Container>
        </FormModal>
      </Container>
    </>
  );
}
