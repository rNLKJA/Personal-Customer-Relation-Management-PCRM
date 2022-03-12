import React from "react";
import './loading.css'
import onload from './Loading Info.gif'
import Heading from '../heading/heading.jsx'
import Navbar from '../nav/Navbar'

export default function Loading() {
    return(

			<React.Fragment>
				<Heading />
					<div className="sub-container" style={{backgroundColor:"rgb(243, 244, 245)"}}>
							<div class="loading">
								<img src={onload} alt="loading page"></img>
							</div>
					</div>
				<Navbar />
			</React.Fragment>
			
    )
}