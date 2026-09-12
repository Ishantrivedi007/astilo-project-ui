import { useQuery } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardBody, CardFooter, Chip, Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading, Reveal } from "../shared";

export interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
  rating?: { rate: number; count: number };
}

const FALLBACK: Product[] = [
  { id: 1, title: "Fjallraven Backpack", price: 109.95, category: "bags", image: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg" },
  { id: 2, title: "Casual Premium Slim Fit T-Shirt", price: 22.3, category: "clothing", image: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg" },
  { id: 3, title: "Mens Cotton Jacket", price: 55.99, category: "clothing", image: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg" },
  { id: 4, title: "John Hardy Dragon Bracelet", price: 695, category: "jewelery", image: "https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg" },
  { id: 5, title: "White Gold Plated Ring", price: 9.99, category: "jewelery", image: "https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg" },
  { id: 6, title: "WD 2TB Portable Hard Drive", price: 64, category: "electronics", image: "https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_.jpg" },
  { id: 7, title: "SanDisk SSD PLUS 1TB", price: 109, category: "electronics", image: "https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_.jpg" },
  { id: 8, title: "Acer 21.5\" Monitor", price: 599, category: "electronics", image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_.jpg" },
];

const emojiFor = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("cloth")) return "👕";
  if (c.includes("jewel")) return "💍";
  if (c.includes("elec")) return "🔌";
  if (c.includes("bag")) return "🎒";
  return "🛍️";
};

const ProductStore = () => {
  const [gridRef] = useAutoAnimate<HTMLDivElement>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await axios.get<Product[]>(
        "https://fakestoreapi.com/products?limit=12"
      );
      return data;
    },
  });

  const products = isError || !data ? FALLBACK : data;

  return (
    <section>
      <PageHeading eyebrow="✦ treat yourself">
        The <span className="gradient-text">drip</span> shop
      </PageHeading>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading the goods…" />
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((p, i) => (
            <Reveal key={p.id} index={i}>
              <Card
                isPressable
                className="group glass-card w-full overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-glow"
                style={{ rotate: `${(i % 2 ? 1 : -1) * 0.6}deg` }}
              >
                <CardBody className="relative overflow-visible p-0">
                  <div className="flex h-44 items-center justify-center bg-white p-4">
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2"
                    />
                  </div>
                  <Chip
                    size="sm"
                    className="absolute left-2 top-2 bg-black/60 text-[10px] text-white backdrop-blur"
                  >
                    {emojiFor(p.category)} {p.category}
                  </Chip>
                </CardBody>
                <CardFooter className="flex flex-col items-start gap-2 p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ink">
                    {p.title}
                  </p>
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-2.5 py-1 text-xs font-bold text-[#17131f]">
                      ${p.price.toFixed(2)}
                    </span>
                    <Button
                      isIconOnly
                      size="sm"
                      radius="full"
                      className="bg-ink/10 text-sm transition-transform hover:scale-110"
                      aria-label="Add to cart"
                      onPress={() =>
                        toast.success(`Added "${p.title}" to cart 🛒`)
                      }
                    >
                      🛒
                    </Button>
                  </div>
                  {p.rating && (
                    <span className="text-[11px] text-ink/50">
                      ⭐ {p.rating.rate} · {p.rating.count} reviews
                    </span>
                  )}
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductStore;
