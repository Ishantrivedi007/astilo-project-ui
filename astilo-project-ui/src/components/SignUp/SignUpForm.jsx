import React, { useState } from "react";
import {
  Container,
  Grid,
  Input,
  // Button,
  Spacer,
  Text,
  Textarea,
} from "@nextui-org/react";
import CustomCard from "../SharedComponents/SharedCard";
import InputField from "../SharedComponents/SharedInput/InputField";
import UserAvatar from "../SharedComponents/UserAvatar";
import { FileUpload } from "primereact/fileupload";
import { Button } from "primereact/button";
import SharedTextArea from "../SharedComponents/SharedTextArea";

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({ ...prevFormData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Implement your signup logic here, e.g., making an API call to register the user
    console.log(formData);
  };

  return (
    <Container>
      <Spacer y={5} />
      <Grid.Container justify="center">
        <Grid xs={6}>
          <CustomCard
            header={<h2>Signup Page</h2>}
            body={
              <form onSubmit={handleSubmit}>
                <Grid.Container gap={2} xs={12}>
                  <Grid>
                    <InputField
                      css={{ marginTop: "20px" }}
                      name="userName"
                      placeholder="User Name"
                      color="primary"
                      size="lg"
                      clearable
                      rounded
                      bordered
                      fullWidth
                      labelPlaceholder="User Name"
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Text b size={20}>
                      Avatar
                    </Text>
                  </Grid>
                  <Grid direction="row" className="flex  items-center">
                    <Grid xs={6}>
                      <UserAvatar
                        src={"https://i.pravatar.cc/150?u=a042581f4e29026024d"}
                        css={{ size: "$25" }}
                      />
                    </Grid>

                    <Grid xs={1} justify="center">
                      <FileUpload
                        //  ref={fileUploadRef}
                        mode="basic"
                        name="demo[]"
                        url="/api/upload"
                        multiple
                        accept="image/*"
                        maxFileSize={1000000}
                        // chooseLabel="Browse"
                        chooseOptions={{
                          style: { borderRadius: "20px" },
                          className: "border rounded-xl",
                        }}
                      ></FileUpload>
                    </Grid>
                  </Grid>
                  <Grid
                  //css={{ borderRadius: "38px" }}
                  //className="border rounded-3xl"
                  >
                    <SharedTextArea
                      //css={{ borderRadius: "$40" }}
                      style={{ borderRadius: "200px", paddingLeft: "10px" }}
                      //className={"rounded-3xl"}
                      //rounded
                      fullWidth
                      size="lg"
                      bordered
                      color="primary"
                      labelPlaceholder="Personal Bio"
                    />
                  </Grid>
                  <Grid
                    xs={12}
                    direction="row"
                    //className="!flex !flex-col"
                    style={{ display: "flex" }}

                    //css={{ borderRadius: "38px" }}
                    //className="border rounded-3xl"
                  >
                    <Grid xs={6}>
                      <InputField
                        //css={{ borderRadius: "$40" }}
                        //style={{ borderRadius: "200px", paddingLeft: "10px" }}
                        //className={"rounded-3xl"}
                        rounded
                        fullWidth
                        size="lg"
                        bordered
                        color="primary"
                        labelPlaceholder="Email"
                      />
                    </Grid>
                    <Grid xs={6}>
                      <InputField
                        //css={{ borderRadius: "$40" }}
                        //style={{ borderRadius: "200px", paddingLeft: "10px" }}
                        //className={"rounded-3xl"}
                        rounded
                        fullWidth
                        size="lg"
                        bordered
                        color="primary"
                        labelPlaceholder="Country"
                      />
                    </Grid>
                  </Grid>
                </Grid.Container>
              </form>
            }
          />
        </Grid>
      </Grid.Container>
    </Container>
  );
};

export default Signup;
