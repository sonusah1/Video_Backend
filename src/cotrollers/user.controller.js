import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/users.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiRespose from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefereshToken = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false});

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating token")
    }
}

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
   const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

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
    coverImage:coverImage.url || ""
   })

   const createdUser=await User.findById(user._id).select("-password -refreshToken");

   if(!createdUser){
    throw new ApiError(404,"User not found");
   }

   return res.status(201).json(
    new ApiRespose(200, createdUser, "User Registered Successfully")
);


   
});

const loginUser = asyncHandler(async (req,res)=>{
    // req body -> data
    // username or email exist
    //check the user
    //password check
    //access and refresh token creation
    //return user data with cookies

    const {username,email,password} = req.body;
    console.log(email);
    

    if(!username && !email)
    {
        throw new ApiError(400,"Username or Email is required");
    }

    const user = await User.findOne(
        {
            $or: [{ username: username }, { email: email }]
        });
    if(!user)
    {
        throw new ApiError(404,"User not found");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user Credentials");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefereshToken(user._id);

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    const options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiRespose(200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "User loggedIn successfully"
    ));
});

const logoutUser = asyncHandler(async(req, res )=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiRespose(200,{},"User Logged Out"));

});


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefereshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefereshToken){
        throw new ApiError(401,"No refresh token provided")
    };

    try {
        const decodedToken =jwt.verify(incomingRefereshToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user=await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh Token");
        }
    
        if(incomingRefereshToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refersh Token is Expired or Used");
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefereshToken(user._id);
    
    
        const options ={
            httpOnly:true,
            secure:true
        }
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiRespose(200,{accessToken,refreshToken:newRefreshToken},"User Authenticated"));
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;

    const user=await User.findById(req.user?._id);

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave:false});

    return res.status(200).json(new ApiRespose(200,"Password changed successfully"));
});

const getCurrentUser = asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user?._id).select("-password");

    return res.status(200).json(new ApiRespose(200,user,"Current User Details fetched Successfully"));
});

const updateAccountDetail = asyncHandler(async(req,res)=>{
    const {fullName,email} =req.body;

    if(!(fullName || email )){
        throw new ApiError(400,"Please fill all the fields");
    }


    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,email,
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200).json(new ApiRespose(200,user,"Account Details updated Successfully"));
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = await req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Please upload a valid avatar image");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)
    {
        throw new ApiError(400,"Error while updating avatar Image");
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200).json(new ApiRespose(200,user,"Avatar updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = await req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Please upload a valid coverImage image");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while updating coverImage Image");
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200).json(new ApiRespose(200,user,"coverImage updated Successfully"));
});

export  {registerUser,loginUser,logoutUser,refreshAccessToken,getCurrentUser,changeCurrentPassword
    ,updateAccountDetail,updateUserCoverImage,updateUserAvatar
};