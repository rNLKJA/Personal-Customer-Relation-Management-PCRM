// import required dependencies
import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

// import Navbar and Map components

import Map from "./API/map/Map";
// import Calendar from "./API/calendar/Calendar";
import Home from "./API/home/home";
import Contact from "./API/contact/Contact";
import Person from "./API/person/Person";
import Record from "./API/record/Record";
// import Search from "./API/search/Search";
import Error from "./API/error/Error";
import Login from "./API/auth/Login";
import Registration from "./API/auth/Registration";
import ProtectedRouters from "./API/auth/ProtectedRouter";
import useFindUser from "./hooks/useFindUser";
import { UserContext } from "./hooks/UserContext";
import AddUser from "./API/contact/addOneContact";
import ManualInput from "./API/contact/manual-input";
import QrCode from "./API/contact/qr-code";
import UserID from "./API/contact/user-id";
import CreateRecord from "./API/record/AddRecord";
import ShowQrCode from "./API/person/qr";
import Reset from "./API/restPassword/Reset";
import FileUpload from "./API/fileUpload/FileUpload";
import FastRegister from "./API/fastRegister/fastRegister";

// defined the map function
function App() {
  const { user, setUser, isLoading } = useFindUser();

  return (
    <div className="container">
      {/* define the route */}

      <Router>
        <UserContext.Provider value={{ user, setUser, isLoading }}>
          {/* <NavbarTop /> */}

          <Switch>
            <ProtectedRouters
              exact
              path="/"
              component={Home}
            ></ProtectedRouters>
            <Route exact path="/login" component={Login}></Route>
            <Route exact path="/signup">
              <Registration />
            </Route>
            <Route exact path="/resetPassword">
              <Reset />
            </Route>

            <ProtectedRouters
              exact
              path="/contact"
              component={Contact}
            ></ProtectedRouters>
            <ProtectedRouters
              exact
              path="/map"
              component={Map}
            ></ProtectedRouters>
            {/* <Route path="/calendar">
            <Calendar />
          </Route> */}
            <ProtectedRouters
              exact
              path="/record"
              component={Record}
            ></ProtectedRouters>

            <ProtectedRouters
              exact
              path="/createRecord"
              component={CreateRecord}
            ></ProtectedRouters>
            {/* <ProtectedRouters
              exact
              path="/search"
              component={Search}
            ></ProtectedRouters> */}
            <ProtectedRouters
              exact
              path="/setting"
              component={Person}
            ></ProtectedRouters>

            <ProtectedRouters
              exact
              path="/addUser"
              component={AddUser}
            ></ProtectedRouters>

            {/* TODO: QR code add contact function */}
            <ProtectedRouters
              exact
              path="/addUser/qr-code"
              component={QrCode}
            ></ProtectedRouters>

            <ProtectedRouters
              exact
              path="/addUser/manual-input"
              component={ManualInput}
            ></ProtectedRouters>

            <ProtectedRouters
              exact
              path="/addUser/user-id"
              component={UserID}
            ></ProtectedRouters>
            <ProtectedRouters
              exact
              path="/setting/qr"
              component={ShowQrCode}
            ></ProtectedRouters>

            <ProtectedRouters
              exact
              path="/uploadTest"
              component={FileUpload}
            ></ProtectedRouters>

            <Route path="/fastRegister/:_id/:authCode">
              <FastRegister />
            </Route>

            <Route path="*">
              <Error msg={"AHHHHHHHH"} />
            </Route>
          </Switch>
        </UserContext.Provider>
      </Router>
    </div>
  );
}

export default App;
