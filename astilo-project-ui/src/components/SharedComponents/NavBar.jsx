import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
} from "@nextui-org/react";
import { AcmeLogo } from "../Navbar/AcmeLogo";
import Login from "../Login/Login";
import SharedButton from "./SharedButton";

const NavBar = () => {
  return (
    <div className="flex flex-row justify-center items-center">
      <Navbar
        position="sticky"
        className="flex border rounded-full w-[75%] mt-2 shadow-xl border-gray-300"
      >
        <NavbarBrand>
          <AcmeLogo />
          <p className="font-bold text-inherit italic">Astilo's</p>
        </NavbarBrand>
        <NavbarContent className="sm:flex gap-4" justify="center">
          <NavbarItem isActive>
            <Link href="/music" aria-current="page">
              Home
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/music">
              Music
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/Movies">
              Movies
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/store">
              Store
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/dashboard">
              Dashboard
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/users">
              Users
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/users">
              NimRose Desk
            </Link>
          </NavbarItem>
        </NavbarContent>
        <NavbarContent justify="end">
          <NavbarItem className="hidden lg:flex">{/* <Login /> */}</NavbarItem>
          <NavbarItem>
            {/* <Button as={Link} color="primary" href="#" variant="flat">
              Sign Up
            </Button> */}
            {/* <Login /> */}
            <SharedButton
              auto
              shadow
              color={"gradient"}
              title={"Login"}
              className={"btn"}
              buttonTextColor={"white"}
              type="submit"
            />
          </NavbarItem>
        </NavbarContent>
      </Navbar>
    </div>
  );
};

export default NavBar;
