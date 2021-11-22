import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      if(productInCart) {
        updateProductAmount({
          productId, amount: productInCart.amount + 1
        });
      } else {
        const { data: product } = await api.get(`/products/${productId}`);
        if(!product)
          throw new Error();

        const updateCart = [ ...cart ];
        updateCart.push({
          ...product,
          amount: 1
        })

        setCart([ ...updateCart ]);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.map(product => product.id).includes(productId))
        throw new Error();

      let updateCart = cart.filter(product => product.id !== productId)
      setCart([ ...updateCart ]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      const { data: productsInStock } = await api.get(`/stock/${productId}`);
      
      if(amount > productsInStock.amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map(product => {
        if(product.id === productId)
          return {
            ...product,
            amount
          }
        return product;
      });

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
