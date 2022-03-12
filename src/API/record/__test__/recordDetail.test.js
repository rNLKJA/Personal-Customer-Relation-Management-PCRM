import React from "react";
import RecordDetail from "../recordDetail"
import { render,getByText,fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { shallow, mount,configure } from'enzyme';
import Card from "@mui/material/Card";
import Adapter from 'enzyme-adapter-react-16';
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import '@testing-library/jest-dom'
configure({ adapter: new Adapter() })
const setup = () =>{
    const prop = {
        "record": {
            "_id": "61850525ad6a5300164324c3",
            "customField": [
                {
                    "field": "1",
                    "value": "2"
                }
            ],
            "meetingPerson": {
                "_id": "61820c87da37250016ed293c",
                "email": [
                    ""
                ],
                "phone": [
                    "0432751551"
                ],
                "meetRecord": [],
                "customField": [],
                "lastName": "Z",
                "firstName": "W",
                "occupation": "1",
                "addDate": "2021-11-03T04:13:59.620Z",
                "note": "1",
                "status": true,
                "ownerAccount": "6181f608da37250016ed2876",
                "linkedAccount": null,
                "__v": 0,
                "portrait": {
                    "data": '',
                    "contentType": "image/jpeg"
                }
            },
            "dateTime": "2021-11-05T18:19:00.000Z",
            "location": "The University of Melbourne",
            "notes": "This is a note",
            "ownerAccount": "6181f608da37250016ed2876",
            "lat": -37.7982,
            "lng": 144.961,
            "pictures": [],
            "__v": 0
        }
    };

    const wrapper = mount(<RecordDetail {...prop} />);

    return {
        prop,
        wrapper,
    }
}

let documentBody 

const {wrapper} = setup();
const CardComponent = wrapper.find(Card)
const expendBtn = wrapper.find(IconButton).find(ExpandMoreIcon)

describe('RecordDetail component test', () => {
    beforeEach(() => {
         const {prop} = setup();
         documentBody = render(<RecordDetail {...prop}/>);
      });
    test("CardContent should exists", () => {
        expect(CardComponent).toBeDefined()
        expect(expendBtn).toBeDefined()

    });
    test("display one record detail", async () => {
        const {prop} = setup();
        
        expect(documentBody.getByText(prop.record.meetingPerson.firstName + ' ' + prop.record.meetingPerson.lastName )).toBeInTheDocument();
        expect(documentBody.getByText('This is a note',{exact: false})).toBeInTheDocument();
        expect(documentBody.getByText(prop.record.location)).toBeInTheDocument();
        
      });

      test("display more details after expend", async () => {
        const {prop} = setup();
        expect(wrapper.text()).not.toMatch(prop.record.meetingPerson.phone[0]);
        expendBtn.simulate('click');
        expect(wrapper.text()).toMatch(prop.record.meetingPerson.phone[0]);
      });
})