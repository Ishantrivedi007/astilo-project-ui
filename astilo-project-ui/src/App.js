import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Shop from "./Shop/Shop.js";
import TableContainer from "./Navbar/TableContainer.js";
import store from "./redux/store.js";
import { Provider } from "react-redux";
import MusicPlayer from "./Audio/MusicPlayer.js";
import Movies from "./components/Movies/Movies.js";
import PageNotFound from "./components/SharedComponents/404NotFound/PageNotFound.jsx";
import Header from "./components/SharedComponents/Navbar.jsx";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";

//theme
import "primereact/resources/themes/lara-light-indigo/theme.css";
//core
import "primereact/resources/primereact.min.css";
import Signup from "./components/SignUp/SignUpForm.jsx";
import Dashboard from "./components/AdminDashboard/Dashboard.jsx";

export default function App() {
  const [visible, setVisible] = useState(false);
  const handler = () => setVisible(true);

  const closeHandler = () => {
    setVisible(false);
    console.log("closed");
  };
  return (
    <>
      <div className="h-screen" style={{ background: "#eff3f8" }}>
        <Provider store={store}>
          <PrimeReactProvider>
            <Header />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Shop />} />
                <Route path="/store" element={<Shop />} />
                <Route path="/music" element={<MusicPlayer />} />
                <Route path="/users" element={<TableContainer />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="*" element={<PageNotFound />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </BrowserRouter>
          </PrimeReactProvider>
        </Provider>
      </div>
    </>
  );
}
