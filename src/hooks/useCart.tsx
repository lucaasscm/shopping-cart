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

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart])

  const addProduct = async (productId: number) => {
    try {
      //CHECK IF PRODUCT EXISTS
           
      const stock = await api.get(`/stock/${productId}`);
      if(!stock.data) {
        toast.error("Erro na adição do produto");
        return
      }
      //CHECK STOCK 
      if(stock.data.amount <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const hasProduct = cart.filter(product => product.id === productId).length != 0;
      
      if(hasProduct) {
        const newCart = cart.map(product => product.id === productId ? {
          ...product,
          amount: product.amount + 1,
        } : product);
        
        await api.put(`/stock/${productId}`, {amount: stock.data.amount - 1});
        
        setCart(newCart);
      } else {
        const myProduct = await api.get(`/products/${productId}`);
        const newProduct = {
          ...myProduct.data,
          amount: 1
        };    
        await api.put(`/stock/${productId}`, {amount: stock.data.amount - 1});
        setCart([...cart,newProduct]);
      }  
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAmount = cart.find(item => item.id === productId)?.amount
      const newCart = cart.filter((item) => item.id !== productId);
      setCart(newCart);
      api.get(`/stock/${productId}`)
      .then((response) => {
        api.put(`/stock/${productId}`, {amount: response.data.amount + productAmount});
      })
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //CHECK STOCK

      const product = cart.find(product => product.id === productId);
      if(!product) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }
      const stock = await api.get(`/stock/${productId}`);

      //CHECK IF WE ARE INCREASING OR DECREASING AMOUNT


      // CASE DECREASING

      if(product.amount > amount) {
        const newCart = cart.map(product => product.id === productId ? {
          ...product,
          amount: amount,
        } : product);

        await api.put(`/stock/${productId}`, {amount: stock.data.amount + 1});

        setCart(newCart);

        return;
      }

      //CASE INCREASING 
      
      if(stock.data.amount == 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const newCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount
      } : product);

      await api.put(`/stock/${productId}`, {amount: stock.data.amount - 1});
  
      setCart(newCart)
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
