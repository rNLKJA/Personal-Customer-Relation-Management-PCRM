// allow to send http request to our app
const mongoose = require('mongoose')


const Contact = require("../../models/contactSchema")
const Record = require('../../models/recordSchema')
const { User } = require("../../models/userSchema")

const recordController = require("../../controller/recordController")


describe('unit test of deleteOneRecord form recordController.js', () => {
    const req = {
        user: {_id : '61503926028ce448aceda136', userName:"test"},
        body:{recordId : '615549ec49ed3c0016a6a18a'}
    }

    const res = {
        send: jest.fn(),
        json: jest.fn()
    }

    // jest.mock("models", ()=> {
    //     return {
    //         ContactList : jest.fn().mockImplementation(() => { return {} })
    //     }
    // });

    beforeAll(() => {
        res.send.mockClear();
        res.json.mockClear();
        
        User.findOne = jest.fn().mockResolvedValue({
            userName: "test", 
            email: [],
            phone:[],
            lastName: "test",
            firstName: "test",
            occupation: "test",
            recordList: ['1234', '4567']
        })

        User.findOne.mockImplementationOnce(() => ({
                lean: jest.fn().mockReturnValue({
                email: [],
                phone:[],
                lastName: "test",
                firstName: "test",
                occupation: "test",
                recordList: ['1234', '4567']
            })
        }))

        User.findOneAndUpdate = jest.fn().mockResolvedValue();
        Record.deleteOne = jest.fn().mockResolvedValue();

        recordController.deleteOneRecord(req, res)
    })

    test("Test case 1: give a valid record Id, record will be deleted", ()=>{
        expect(User.findOneAndUpdate).toHaveBeenCalledTimes(1)
        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            {_id: mongoose.Types.ObjectId("61503926028ce448aceda136")}, 
            {recordList: ['1234', '4567']}
        )
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            status:"success"
        })
    })
})

describe("Unit testing deleteOneRecord from recordController with invalid record Id", () => {
    const req = {
        user: {_id : '61503926028ce448aceda136'},
        body:{recordId : '1234567894'}
    }

    const res = {
        send: jest.fn(),
        json: jest.fn()
    }

    beforeAll(() => {
        res.send.mockClear();
        res.json.mockClear();
        
        User.findOne = jest.fn().mockResolvedValue({
            userName: "test", 
            email: [],
            phone:[],
            lastName: "test",
            firstName: "test",
            occupation: "test",
            recordList: []
        })

        User.findOne.mockImplementationOnce(() => ({
                lean: jest.fn().mockReturnValue({
                email: [],
                phone:[],
                lastName: "test",
                firstName: "test",
                occupation: "test",
                recordList: []
            })
        }))

        User.findOneAndUpdate = jest.fn().mockResolvedValue();
        Record.deleteOne = jest.fn().mockResolvedValue();

        recordController.deleteOneRecord(req, res)
    })

    test("test case 1: testing with fail dabase query, excepting error message", ()=>{
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({ status: "failed" })
    })
})
