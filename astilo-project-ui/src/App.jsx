import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
//import Shop from "./Shop/Shop.js";
//import TableContainer from "./Navbar/TableContainer.js";
//import store from "./redux/store.js";
//import { Provider } from "react-redux";
//import MusicPlayer from "./Audio/MusicPlayer.jsx";
//import Movies from "./components/Movies/Movies.js";
//import PageNotFound from "./components/SharedComponents/404NotFound/PageNotFound.jsx";
import Header from "./components/SharedComponents/NavBar.jsx";
//import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import { NextUIProvider } from "@nextui-org/react";
import MusicPlayer from "./components/MusicPlayer/MusicPlayer.jsx";
import SecondMusicPlayer from "./components/MusicPlayer/SecondMusicPlayer.jsx";
import ThirdMusicPlayer from "./components/MusicPlayer/ThirdMusicPlayer.jsx";
import MusicPlayerIndex from "./components/MusicPlayer/index.jsx";
import MovieHome from "./components/Movies/MovieHome.jsx";
//theme
//import "primereact/resources/themes/lara-light-indigo/theme.css";
//core
//import "primereact/resources/primereact.min.css";
//import Signup from "./components/SignUp/SignUpForm.jsx";
//import Dashboard from "./components/AdminDashboard/Dashboard.jsx";
// core version + navigation, pagination modules:
import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";
// import Swiper and modules styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import DashboardPage from "./components/DashBoard/Dashboard.jsx";
import CentralisedStore from "./components/Store/index.jsx";
import AppRoutes from "./app/AppRoutes.jsx";

// import "@tremor/react/dist/tremor.css";
// import "@tremor/react/dist/tremor.css";
export default function App() {
  // init Swiper:
  const swiper = new Swiper(".swiper", {
    // configure Swiper to use modules
    modules: [Navigation, Pagination],
  });

  const [visible, setVisible] = useState(false);
  const handler = () => setVisible(true);

  const closeHandler = () => {
    setVisible(false);
    console.log("closed");
  };
  return (
    <>
      {" "}
      <NextUIProvider>
        <div className="App h-screen" style={{ background: "#eff3f8" }}>
          {/* <div className="h-full" style={{ background: "#eff3f8" }}> */}
          {/* <Provider store={store}> */}

          {/* <PrimeReactProvider> */}
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </div>
      </NextUIProvider>
    </>
  );
}
