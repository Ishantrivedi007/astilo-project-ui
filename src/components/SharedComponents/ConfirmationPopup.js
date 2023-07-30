import React from "react";
import { Modal, Row, Checkbox, Button, Text } from "@nextui-org/react";

const ConfirmationPopup = ({
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
  checkBox = false,
  checkSecondText,
  checkBoxText,
  secondButtonText,
  onButtonClick,
  secondButtonColor,
  firstTitle,
  BoldTitle,
  promptText,
}) => {
  const [visible, setVisible] = React.useState(true);
  const closeHandler = () => {
    setVisible(false);
    onClose && onClose(); // Call the onClose callback if provided
    console.log("closed");
  };

  return (
    <>
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
      >
        <Modal.Header>
          <Text id="modal-title" size={18}>
            {firstTitle}
            <Text b size={18}>
              {BoldTitle}
            </Text>
          </Text>
        </Modal.Header>
        <Modal.Body>
          <Text size={15} b>
            {promptText}
          </Text>
          {checkBox && (
            <Row justify="space-between">
              <Checkbox>
                <Text size={14}>{checkBoxText}</Text>
              </Checkbox>
              <Text size={14}>{checkSecondText}</Text>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button auto flat color="error" onPress={closeHandler}>
            {closeText}
          </Button>
          <Button auto color={secondButtonColor} onPress={onButtonClick}>
            {secondButtonText}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ConfirmationPopup;
