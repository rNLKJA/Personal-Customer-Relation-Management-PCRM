import React, { useState } from "react";
import { useShowProfile } from "../../BackEndAPI/profileAPI";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import Heading from "../heading/heading.jsx";
import Navbar from "../nav/Navbar";
import Alert from '@mui/material/Alert'

const ShowQrCode = () => {
  const [imageUrl, setImageUrl] = useState();
  const { loading, profile, error } = useShowProfile();

  if (error) {
    return (
      <React.Fragment>
        <Heading />
        <Navbar />
        <div className="sub-container">
          <div className="sub-container">Error</div>;
        </div>
      </React.Fragment>
    );
  }

  if (loading) {
    return (
      <React.Fragment>
        <Heading />
        <Navbar />
        <div className="sub-container">
          <div className="loading">
            <h1>Loading Your Information</h1>
            <h1>(っ˘ω˘ς )</h1>
          </div>
        </div>
      </React.Fragment>
    );
  }

  const generateQR = async () => {
    try {
      const response = await QRCode.toDataURL(profile.userName);
      setImageUrl(response);
    } catch (error) {
      console.log(error);
    }
  };

  if (profile.userName) {
    generateQR();
  }

  return (
    <React.Fragment>
      <Heading />
      <Navbar />
      <div className="sub-container">
      <Alert severity="info">Make sure you fill out all your personal information field. Otherwise, QR code scan will failed :)</Alert>
        <div style={{width: "350px", height: "350px", position: "fixed", top: "50%", left: '50%', transform: "translate(-50%, -50%)"}}>
					{imageUrl ? <img src={imageUrl} alt="img" style={{width: "100%", height: "100%", position: "fixed", top: "50%", left: '50%', transform: "translate(-50%, -50%)"}}/> : null}
				</div>
        <Link to="/setting">
          <button className="logout-btn">Back</button>
        </Link>
      </div>
    </React.Fragment>
  );
};
export default ShowQrCode;
