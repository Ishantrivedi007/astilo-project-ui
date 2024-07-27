/*React Libraries */
import React from "react";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

const Loader = () => {
  return (
    <>
      <Backdrop
        sx={{ color: "#a82466", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={true}
      >
        <CircularProgress />
      </Backdrop>
    </>
  );
};

export default Loader;
