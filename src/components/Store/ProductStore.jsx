import React from "react";
import { Card, CardBody, CardFooter, Image } from "@nextui-org/react";

const ProductStore = () => {
  const list = [
    {
      title: "Watch",
      img: "https://www.boredpanda.com/blog/wp-content/uploads/2014/05/creative-watches-12.jpg",
      price: "$150.00",
    },
    {
      title: "Nike Shoes",
      img: "https://staticg.sportskeeda.com/editor/2022/10/7bca2-16668384238727-1920.jpg?w=640",
      price: "$120.00",
    },
    {
      title: "Laptop",
      img: "https://www.91-cdn.com/hub/wp-content/uploads/2024/03/geforce-rtx-40-series-laptops.jpg",
      price: "$900.00",
    },
    {
      title: "Smartphone",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT76iXKxEr6QI1PHkb0JrWZukW_YVEWhBRSCg&s",
      price: "$700.00",
    },
    {
      title: "Camera",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyLBVvwOXR_1MsP_RUxhOhVGCyO1b8-l5l5g&s",
      price: "$550.00",
    },
    {
      title: "Headphones",
      img: "https://w0.peakpx.com/wallpaper/325/104/HD-wallpaper-neon-headphones-cg-headphones-cool-neon.jpg",
      price: "$80.00",
    },
    {
      title: "Backpack",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFL6wOr-463GUgCmbcGjfyVX5g9DH-cOwMXA&s",
      price: "$60.00",
    },
    {
      title: "Sunglasses",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ62bRXNV6uqYju3kBDZqgc9wxMJ_HFYfLGkw&s",
      price: "$50.00",
    },
  ];

  return (
    <div className="mt-7 px-4 gap-3 grid grid-cols-2 sm:grid-cols-4">
      {list.map((item, index) => (
        <Card
          shadow="sm"
          key={index}
          isPressable
          onPress={() => console.log("item pressed")}
        >
          <CardBody className="overflow-visible p-0">
            <Image
              shadow="sm"
              radius="lg"
              width="100%"
              alt={item.title}
              className="w-full object-cover h-[140px]"
              src={item.img}
            />
          </CardBody>
          <CardFooter className="text-small justify-between">
            <b>{item.title}</b>
            <p className="text-default-500">{item.price}</p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default ProductStore;
