import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart != null) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const myCart = [...cart]
      const hasProduct = myCart.find(product => product.id === productId);

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = hasProduct ? hasProduct.amount : 0; 
      const wantedAmount = currentAmount + 1; 

      if(stockAmount < wantedAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      if(hasProduct) {
        hasProduct.amount = wantedAmount;
      } else {
        const myProduct = await api.get(`/products/${productId}`);
        const newProduct = {
          ...myProduct.data,
          amount: wantedAmount
        };
        myCart.push(newProduct);    
      }  

      setCart(myCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(myCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const myCart = [...cart];
      const product = cart.find(product => product.id === productId);
      if(!product) {
        toast.error('Erro na remoção do produto');
        return
      }
      const newCart = cart.filter((item) => item.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const myCart = [...cart];
      const product = myCart.find(product => product.id === productId);     
      const stock = await api.get(`/stock/${productId}`);

      if(!product) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      } else if(stock.data.amount < amount || amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      product.amount = amount;
  
      setCart(myCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(myCart));
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
