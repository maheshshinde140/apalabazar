import Review from "../models/review.model.js";
import {findProductById} from "../services/product.js"

async function createReview(reqData,user) {//add user in parameters of function
  // console.log("req data ",reqData)
  const product = await findProductById(reqData.productId);

  if(!product){ 
    throw new Error("product not found with id ", reqData.productId)
  }
  
  const review = new Review({
    user: user._id,
    product: product._id,
    review: reqData.review,
    createdAt: new Date(),
  });
  
  await product.save();
  return await review.save();
}

async function getAllReview(productId) {
  const product = await productService.findProductById(productId);

  if(!product){
    throw new Error("product not found with id ", productId)
  }
  
  const reviews = await Review.find({ product: productId }).populate("user");
  console.log("reviews ",reviews)
  return reviews
}

export {
  createReview,
  getAllReview,
};
