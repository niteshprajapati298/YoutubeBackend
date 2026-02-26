import asyncHandler from "../../utils/asyncHandler.js";
import { validateRegister } from "../validator.js/user.validator.js";

const registerUser = asyncHandler(async (req, res) => {
    // Break the logic in multiple small parts 

    // step 1 ->  get the data from the user 
    const userData = req.body

    const error = validateRegister(userData);
    if (error.length > 0) return res.status(401).json({
        success: false,
        error
    })

    // step 2 -> validate the data 


    // step 3 -> database check if user entry already exists in database


    // step 4 -> create an entry in the db 


    // return the response the user

    return res.status(201).json({
        message: "success"
    })
})

export { registerUser };