import React, { useState } from "react";
import "./contact.css";
import fetchClient from "../axiosClient/axiosClient";
// import qr_code from "./qr-code.png";
// import hand_write from "./notes.png";
import QrReader from "react-qr-reader";
import Heading from '../heading/heading.jsx'
import Navbar from '../nav/Navbar'
import Alert from '@mui/material/Alert'

const AddUser = () => {
    // const qrRef = useRef(null);
    //const [state,setState]=useState(false);
    const [userName, setUserName] = useState("");
    const [message, setMessage] = useState("");
    const [oldName, setOldName] = useState("");

    const submitUserID = async () => {
/*        e.preventDefault();
				console.log(123)*/
        const contact = {
            userName,
        };

        console.log(contact)

        await fetchClient
            .post("/contact/createContactByUserName", contact)
            .then(res => {
                if (res.data.status) {
                    console.log('Successfully Added')
                    alert('Successfully Added '+ userName+ ' !')
                    window.location.href = "/contact";
                } else{
                    setMessage({msg:res.data.msg,status:false})
                }
                console.log(res)
            }) // TODO: duplicate account issue
            .catch((err) => {
                console.error(err);
            });

        setUserName("");
    };

/*    const [scanResultFile, setScanResultFile] =useState("");
    const handleErrorFile = (error) =>{
        console.log(error);
    }
    const handleScanFile = (result) => {
        if (result){
            setScanResultFile(result);
        }
    }
    const onScanFile = () => {
        qrRef.current.openImageDialog();
    }*/

    const handleErrorWebCam = (error) => {
        console.log(error)

    }

    const handleScanWebCam = (result) => {
        if (result){
            setUserName(result);
            console.log(userName)
            if(userName && (result !== oldName)){
                console.log(result)
                console.log(oldName)
                submitUserID();
                setOldName(result);
            }
        }

    }


    return (
        <React.Fragment>
						<Heading />
						<Navbar />
            <div className="sub-container">
                
                <div className="add-contact-container">
{/*                    <button onClick={onScanFile}>Scan Qr Code</button>
                    <QrReader
                        ref={qrRef}
                        delay = {300}
                        style = {{width: '100%'}}
                        onError={handleErrorFile}
                        onScan={handleScanFile}
                        legacyMode
                    />
                    <div>Scanned Code:{scanResultFile}</div>*/}

                    <QrReader
                        delay = {300}
                        style={{width: '100%'}}
                        onError = {handleErrorWebCam}
                        onScan = {handleScanWebCam}
                    />
                    <h3>UserID: {userName}</h3>
                    {message ? message.status? <Alert severity="success">{message.msg}</Alert> :<Alert severity="error">{message.msg}</Alert>:null}
{/*                    <form className="newID" method="POST" onSubmit={submitUserID}>
                        <button type="submit" className='btn btn-primary'>Add Contact</button>
                    </form>*/}

                </div>


            </div>
        </React.Fragment>

    )

}

export default AddUser;