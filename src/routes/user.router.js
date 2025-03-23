import { Router } from "express";
import {registerUser,loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, 
    updateAccountDetail,updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory} from "../cotrollers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),

    registerUser);

    router.route("/login").post(loginUser);


    //secure url
    router.route("/logout").post(verifyJwt,logoutUser);
    router.route("/refresh-token").post(refreshAccessToken);

    router.route("/changePassword").post(verifyJwt,changeCurrentPassword);
    router.route("currentUser").get(verifyJwt,getCurrentUser);
    router.route("/update-User-Detail").post(verifyJwt,updateAccountDetail);

    router.route('/update-avatar').patch(verifyJwt,upload.single("avatar"),updateUserAvatar);
    router.route('/update-coverImage').patch(verifyJwt,upload.single("coverImage"),updateUserCoverImage);
    router.route("/c/:username").get(verifyJwt,getUserChannelProfile);
    router.route('/history').get(verifyJwt,getWatchHistory);

export default router;