const mongoose = require('mongoose')

const Contact = require("../../models/contactSchema")
const Record = require("../../models/recordSchema")
const { User } = require("../../models/userSchema")


const recordController = require("../../controller/recordController")




describe('unit test of showAllRecords form recordController.js', () => {
    const req = {
        user: {_id : '61503926028ce448aceda136'},
        body:{
        contact_id : '615a1395adfb0c0016f8ba06',
        location: 'UoM',
        dateTime: "2021-5-1",
        geoCoords: {
            lat: "31.44554",
            lng: "48.84845"
        },
        notes:""}
    }

    const res = {
        send: jest.fn(),
        json: jest.fn()
    }

    beforeAll(() => {
        res.send.mockClear();
        res.json.mockClear();

        User.findOne = jest.fn().mockResolvedValue({
            email: [],
            phone:[],
            lastName: "Huang",
            firstName: "test",
            occupation: "test",
            recordList: ['615a1395adfb0c0016f8ba06'],
            __v:0
        })
        
        User.findOne.mockImplementationOnce(() => ({
            lean: jest.fn().mockReturnValue({
                email: [],
                phone:[],
                lastName: "Huang",
                firstName: "test",
                occupation: "test", 
                recordList: ['615a1395adfb0c0016f8ba06'],
                }
            )
        }))

        Record.findOne = jest.fn().mockResolvedValue({
            meetingPerson: '615a1395adfb0c0016f8ba06',
            location: 'UoM',
            dateTime: "2021-5-1",
            lat:"31.44554",
            lng: "48.84845",
            notes:"",
            linkedAccount: null,
            ownerAccount:'61503926028ce448aceda136',
            save: User.findOneAndUpdate
        })

        Record.findOne.mockImplementationOnce(() => ({
            populate: jest.fn().mockReturnValueOnce({
                meetingPerson: '615a1395adfb0c0016f8ba06',
                location: 'UoM',
                dateTime: "2021-5-1",
                lat:"31.44554",
                lng: "48.84845",
                notes:"",
                linkedAccount: null,
                ownerAccount:'61503926028ce448aceda136',
            }),
            populate: jest.fn().mockImplementationOnce(() => ({
                populate: jest.fn().mockReturnValueOnce({
                    meetingPerson: '615a1395adfb0c0016f8ba06',
                    location: 'UoM',
                    dateTime: "2021-5-1",
                    lat:"31.44554",
                    lng: "48.84845",
                    notes:"",
                    linkedAccount: null,
                    ownerAccount:'61503926028ce448aceda136',
                }),

                populate: jest.fn().mockImplementationOnce(() => ({
                    lean: jest.fn().mockReturnValue({
                    meetingPerson: '615a1395adfb0c0016f8ba06',
                    location: 'UoM',
                    dateTime: "2021-5-1",
                    lat:"31.44554",
                    lng: "48.84845",
                    notes:"",
                    linkedAccount: null,
                    ownerAccount:'61503926028ce448aceda136',
                    })
                }))
            }))
        }))

        recordController.showAllRecords(req, res)
    })

    test("Test case 1: show all Records with correct contact id that doesn't have a account", ()=>{
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith([        
            {
                meetingPerson: '615a1395adfb0c0016f8ba06',
                location: 'UoM',
                dateTime: "2021-5-1",
                lat:"31.44554",
                lng: "48.84845",
                notes:"",
                linkedAccount: null,
                ownerAccount:'61503926028ce448aceda136',
            }
        ]
        )
    })
})


describe('unit test of showAll form recordController.js invalid situation', () => {
    const req = {
        user: {_id : '61503926028ce448aceda136'},
        body:{
        contact_id : '615a1395adfb0c0016f8ba06',
        location: 'UoM',
        dateTime: "2021-5-1",
        geoCoords: {
            lat: "31.44554",
            lng: "48.84845"
        },
        notes:""}
    }

    const res = {
        send: jest.fn(),
        json: jest.fn()
    }

    beforeAll(() => {
        res.send.mockClear();
        res.json.mockClear();

        User.findOne = jest.fn().mockResolvedValue({
            email: [],
            phone:[],
            lastName: "Huang",
            firstName: "test",
            occupation: "test",
            recordList: ['1234'],
            __v:0
        })
        
        User.findOne.mockImplementationOnce(() => ({
            lean: jest.fn().mockReturnValue({
                email: [],
                phone:[],
                lastName: "Huang",
                firstName: "test",
                occupation: "test", 
                recordList: ['1234'],
                }
            )
        }))

        Record.findOne = jest.fn().mockResolvedValue({
            meetingPerson: '615a1395adfb0c0016f8ba06',
            location: 'UoM',
            dateTime: "2021-5-1",
            lat:"31.44554",
            lng: "48.84845",
            notes:"",
            linkedAccount: null,
            ownerAccount:'61503926028ce448aceda136',
            save: User.findOneAndUpdate
        })

        Record.findOne.mockImplementationOnce(() => ({
            populate: jest.fn().mockReturnValueOnce({
                meetingPerson: '615a1395adfb0c0016f8ba06',
                location: 'UoM',
                dateTime: "2021-5-1",
                lat:"31.44554",
                lng: "48.84845",
                notes:"",
                linkedAccount: null,
                ownerAccount:'61503926028ce448aceda136',
            }),
            populate: jest.fn().mockImplementationOnce(() => ({
                populate: jest.fn().mockReturnValueOnce({
                    meetingPerson: '615a1395adfb0c0016f8ba06',
                    location: 'UoM',
                    dateTime: "2021-5-1",
                    lat:"31.44554",
                    lng: "48.84845",
                    notes:"",
                    linkedAccount: null,
                    ownerAccount:'61503926028ce448aceda136',
                }),

                populate: jest.fn().mockImplementationOnce(() => ({
                    lean: jest.fn().mockReturnValue({
                    meetingPerson: '615a1395adfb0c0016f8ba06',
                    location: 'UoM',
                    dateTime: "2021-5-1",
                    lat:"31.44554",
                    lng: "48.84845",
                    notes:"",
                    linkedAccount: null,
                    ownerAccount:'61503926028ce448aceda136',
                    })
                }))
            }))
        }))

        recordController.showAllRecords(req, res)
    })

    test("Test case 1: show all Records with incorrect contact id", ()=>{
        expect(res.send).toHaveBeenCalledTimes(1);
    })
})