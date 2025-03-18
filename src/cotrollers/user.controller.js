import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/users.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiRespose from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
   const { username,fullName, email, password } = req.body;
   
   if(
    [username,fullName, email, password ].some((fields)=>fields?.trim() === "")
    )
    {
    throw new ApiError(400,"All fields are required");
   };

   const existingUser=await User.findOne({
    $or:[{ email },{ username }]
   });

   if(existingUser){
    throw new ApiError(404,"User already exists");
   };

   const avatarLocalPath=req.files?.avatar[0]?.path;
   const coverImageLocalPath =req.files?.coverImage[0]?.path;

   if(!avatarLocalPath)
   {
    throw new ApiError(400,"Avatar is required");
   }

   const avatar=await uploadOnCloudinary(avatarLocalPath);
   const coverImage=await uploadOnCloudinary(coverImageLocalPath);

   if(!avatar)
   {
    throw new ApiError(400,"Avatar upload failed");
   }

   const user = await User.create({
    username:username.toLowerCase(),
    fullName,
    email,
    password,
    avatar:avatar.url,
    coverImage:coverImage.url
   })

   const createdUser=await User.findById(user._id).select("-password -refreshToken");

   if(!createdUser){
    throw new ApiError(404,"User not found");
   }

   return res.status(201).json(
    new ApiRespose(200, createdUser, "User Registered Successfully")
);


   
})

export default registerUser;