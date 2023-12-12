import React from "react";
import { Navbar, Button, Link, Text } from "@nextui-org/react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
//import Layout from "./Navbar/Layout.js";
import { AcmeLogo } from "../../Navbar/AcmeLogo.js";
import Login from "../../Login/Login.js";

const Header = () => {
  return (
    <Navbar isBordered variant="floating">
      <Navbar.Brand>
        <AcmeLogo />
        <Text b i color="inherit" hideIn="xs">
          Astilo's
        </Text>
      </Navbar.Brand>
      <Navbar.Content hideIn="xs" activeColor={"primary"} variant="underline">
        <Navbar.Link href="/music">Home</Navbar.Link>
        <Navbar.Link href="/music">Music</Navbar.Link>
        <Navbar.Link href="/Movies">Movies</Navbar.Link>
        <Navbar.Link href="/store">Store</Navbar.Link>
        <Navbar.Link href="/dashboard">Dashboard</Navbar.Link>
        <Navbar.Link href="/users">Users</Navbar.Link>
        <Navbar.Link href="/users">NimRose Desk</Navbar.Link>
      </Navbar.Content>
      <Navbar.Content>
        <Navbar.Item>
          <Login />
        </Navbar.Item>
      </Navbar.Content>
    </Navbar>
  );
};

export default Header;
