import React from "react";
import { Modal, Input, Row, Checkbox, Button, Text } from "@nextui-org/react";
import InputField from "./SharedInput/InputField";
import { Password } from "../../Login/Password";
import PasswordInput from "./SharedInput/PasswordInput";
import SharedButton from "../SharedButton";
import "./GradientButton.css";
// import { Mail } from "./Mail";
// import { Password } from "./Password";

const FormModal = ({
  closeButton = true,
  onClose,
  open,
  blur = true,
  preventClose,
  modalScroll,
  animation = true,
  fullScreen,
  autoMargin,
  width,
  closeText,
  onButtonClick,
  secondButtonText,
  secondButtonColor = "primary",
  children,
  secondButtonClass,
  buttonShow = false,
  style,
}) => {
  const [visible, setVisible] = React.useState(true);
  const closeHandler = () => {
    setVisible(false);
    onClose && onClose(); // Call the onClose callback if provided
    console.log("closed");
  };

  return (
    <div>
      <Modal
        closeButton={closeButton}
        blur={blur}
        aria-labelledby="modal-title"
        open={open}
        onClose={onClose}
        preventClose={preventClose}
        animated={animation}
        scroll={modalScroll}
        fullScreen={fullScreen}
        autoMargin={autoMargin}
        width={width}
        style={style}
      >
        <Modal.Header>
          <Text id="modal-title" size={18}>
            Welcome to
            <Text b i size={18}>
              {" "}
              Astilo's
            </Text>
          </Text>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
        {buttonShow && (
          <Modal.Footer>
            <SharedButton
              auto={true}
              flat={true}
              shadow={false}
              color={"error"}
              buttonTextColor={"error"}
              title={closeText}
              onPress={closeHandler}
            />
            <SharedButton
              auto
              shadow
              onPress={onButtonClick}
              color={secondButtonColor}
              title={secondButtonText}
              className={secondButtonClass}
              buttonTextColor={"white"}
              type="submit"
            />
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default FormModal;
