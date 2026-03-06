import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Settings, 
  Menu as MenuIcon, 
  X, 
  Phone, 
  MapPin, 
  Clock, 
  Plus,
  Minus,
  Trash2,
  Truck,
  CreditCard,
  MessageCircle,
  Edit,
  Save,
  LogOut,
  Upload,
  Video,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react';
import type { MenuItem, Category, RestaurantSettings, Order } from './types';
import { initialCategories, initialMenuItems, initialSettings } from './data';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to generate unique IDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().substring(0, 8).toUpperCase();
  }
  // Fallback: use performance.now() for timestamp-based ID
  const timestamp = performance.now().toString(36).replace('.', '').toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
  return timestamp.slice(-5) + random.slice(-3);
};

function App() {
  // Clean old localStorage keys and check storage usage
  useEffect(() => {
    try {
      // Remove ALL old keys that are no longer used
      const oldKeys = ['minas_settings', 'minas_categories', 'minas_items', 'minas_orders'];
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`Removed old localStorage key: ${key}`);
        }
      });
      
      // Check total localStorage usage
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          totalSize += new Blob([value]).size;
        }
      }
      const totalSizeMB = totalSize / 1024 / 1024;
      console.log(`Total localStorage usage: ${totalSizeMB.toFixed(2)}MB`);
      
      if (totalSizeMB > 4) {
        console.warn('localStorage is getting full. Consider cleaning old data.');
      }
    } catch (e) {
      console.error('Error cleaning old localStorage:', e);
    }
  }, []);


  // Persistence initialization
  const getStoredData = <T,>(key: string, initial: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initial;
      const parsed = JSON.parse(stored);
      // Migration: Fix old wrong names
      if ((key === 'minas_settings' || key === 'minas_v2_settings') && parsed.name) {
        const oldNames = ['FOGÃO E SABÃO', 'FOGÃO ESABOR', 'Panela de Minas', 'Meu Restaurante', 'FOGÃO & SABOR', 'Fogão & Sabor', 'Fogão &amp; Sabor'];
        const nameUpper = parsed.name.toUpperCase().trim();
        // Check if name contains old variations
        if (oldNames.includes(parsed.name) || 
            nameUpper.includes('FOGÃO') && nameUpper.includes('SABOR') ||
            nameUpper === 'FOGÃO & SABOR' ||
            parsed.name.includes('Fogão') && parsed.name.includes('Sabor')) {
          parsed.name = 'Sabor Fogão a Lenha';
          // Save updated name immediately
          try {
            localStorage.setItem(key, JSON.stringify(parsed));
          } catch (e) {
            console.error('Error saving migrated name:', e);
          }
        }
      }
      return parsed;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initial;
    }
  };

  const [categories, setCategories] = useState<Category[]>(() => getStoredData('minas_v2_categories', initialCategories));
  const [items, setItems] = useState<MenuItem[]>(() => getStoredData('minas_v2_items', initialMenuItems));
  const [settings, setSettings] = useState<RestaurantSettings>(() => getStoredData('minas_v2_settings', initialSettings));
  const [orders, setOrders] = useState<Order[]>(() => getStoredData('minas_v2_orders', []));
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<Order | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: '', price: '', description: '', category: '' });


  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file: File, callback: (base64: string) => void) => {
    try {
      // Compress image before saving
      const compressedBase64 = await compressImage(file);
      callback(compressedBase64);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fallback to original method if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Persistence effects
  useEffect(() => {
    document.title = settings.name || 'Sabor Fogão a Lenha';
  }, [settings.name]);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Force migration on mount if name is still old
  useEffect(() => {
    if (settings.name && (
      settings.name.includes('Fogão & Sabor') || 
      settings.name.includes('FOGÃO & SABOR') ||
      settings.name === 'Fogão & Sabor' ||
      (settings.name.toUpperCase().includes('FOGÃO') && settings.name.toUpperCase().includes('SABOR') && !settings.name.includes('Lenha'))
    )) {
      setSettings(prev => ({...prev, name: 'Sabor Fogão a Lenha'}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Auto-save to localStorage (only after initialization to avoid overwriting loaded data)
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('minas_v2_categories', JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
    }
  }, [categories, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      const itemsJson = JSON.stringify(items);
      const sizeInMB = new Blob([itemsJson]).size / 1024 / 1024;
      
      if (sizeInMB > 4) {
        console.warn('Items data is too large for localStorage:', sizeInMB.toFixed(2), 'MB');
        // Try to save without images if too large
        const itemsWithoutLargeImages = items.map(item => ({
          ...item,
          image: item.image && item.image.length > 100000 ? undefined : item.image
        }));
        localStorage.setItem('minas_v2_items', JSON.stringify(itemsWithoutLargeImages));
      } else {
        localStorage.setItem('minas_v2_items', itemsJson);
      }
    } catch (error) {
      console.error('Error saving items to localStorage:', error);
      // Only show alert if it's actually a quota error, not other errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          const itemsJsonForSize = JSON.stringify(items);
          const currentSize = new Blob([itemsJsonForSize]).size / 1024 / 1024;
          console.error('Quota exceeded. Current items size:', currentSize.toFixed(2), 'MB');
        } catch (e) {
          console.error('Error calculating size:', e);
        }
        alert('Armazenamento cheio! Algumas imagens podem não ter sido salvas. Tente remover imagens antigas ou usar imagens menores.');
      }
    }
  }, [items, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      const settingsJson = JSON.stringify(settings);
      const sizeInMB = new Blob([settingsJson]).size / 1024 / 1024;
      
      // Try to save normally first
      try {
        localStorage.setItem('minas_v2_settings', settingsJson);
      } catch (saveError) {
        // Only handle quota errors, ignore other errors
        if (saveError instanceof DOMException && saveError.name === 'QuotaExceededError') {
          console.warn('Quota exceeded. Settings size:', sizeInMB.toFixed(2), 'MB. Trying without largest files.');
          // If still fails, try without very large files
          try {
            const settingsWithoutLargeMedia = {
              ...settings,
              heroVideo: settings.heroVideo && settings.heroVideo.length > 10000000 ? undefined : settings.heroVideo,
              heroImage: settings.heroImage && settings.heroImage.length > 2000000 ? undefined : settings.heroImage,
              aboutImage1: settings.aboutImage1 && settings.aboutImage1.length > 2000000 ? undefined : settings.aboutImage1,
              aboutImage2: settings.aboutImage2 && settings.aboutImage2.length > 2000000 ? undefined : settings.aboutImage2,
            };
            localStorage.setItem('minas_v2_settings', JSON.stringify(settingsWithoutLargeMedia));
            console.warn('Saved settings without largest media files');
          } catch {
            // If still fails, throw to outer catch
            throw saveError;
          }
        } else {
          // Re-throw non-quota errors
          throw saveError;
        }
      }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      // Only show alert if it's actually a quota error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          const settingsJsonForSize = JSON.stringify(settings);
          const currentSize = new Blob([settingsJsonForSize]).size / 1024 / 1024;
          console.error('Quota exceeded. Current settings size:', currentSize.toFixed(2), 'MB');
        } catch (e) {
          console.error('Error calculating size:', e);
        }
        alert('Armazenamento cheio! Alguns arquivos de mídia podem não ter sido salvos. Tente remover arquivos antigos ou usar arquivos menores.');
      } else {
        // Log other errors but don't show alert
        console.error('Non-quota error saving settings:', error);
      }
    }
  }, [settings, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('minas_v2_orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving orders to localStorage:', error);
    }
  }, [orders, isInitialized]);

  // Admin tabs
  const [adminTab, setAdminTab] = useState<'items' | 'categories' | 'orders' | 'settings'>('orders');

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

  const placeOrder = () => {
    if (!customerName || !customerPhone || !deliveryAddress) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const orderId = generateId();
    const newOrder: Order = {
      id: orderId,
      customerName,
      customerPhone,
      address: deliveryAddress,
      items: [...cart],
      total: cartTotal + settings.deliveryFee,
      status: 'pending',
      createdAt: new Date().toISOString(),
      paymentMethod,
    };

    // Add to orders list
    setOrders(prev => [newOrder, ...prev]);

    // Prepare WhatsApp message
    const itemsList = cart.map(i => `*${i.quantity}x ${i.item.name}* - R$ ${(i.item.price * i.quantity).toFixed(2)}`).join('\n');
    const message = `*NOVO PEDIDO #${orderId}*\n\n` +
      `*Cliente:* ${customerName}\n` +
      `*Telefone:* ${customerPhone}\n` +
      `*Endereço:* ${deliveryAddress}\n` +
      `*Pagamento:* ${paymentMethod}\n\n` +
      `*Itens:*\n${itemsList}\n\n` +
      `*Subtotal:* R$ ${cartTotal.toFixed(2)}\n` +
      `*Taxa de Entrega:* R$ ${settings.deliveryFee.toFixed(2)}\n` +
      `*TOTAL:* R$ ${(cartTotal + settings.deliveryFee).toFixed(2)}\n\n` +
      `_Pedido realizado via Site_`;

    const whatsappUrl = `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    // Clear cart and close modals
    setCart([]);
    setIsCheckoutOpen(false);
    setIsPaymentReviewOpen(false);
    setIsCartOpen(false);
    
    // Show confirmation screen
    setOrderConfirmation(newOrder);
    
    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(i => i.category === activeCategory);

  // Export all data to JSON file (full backup)
  const exportData = () => {
    try {
      const exportData = {
        categories: categories,
        items: items,
        settings: settings,
        orders: orders,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `minas-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Dados exportados com sucesso! Salve este arquivo em local seguro.');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  };

  // Export optimized data for sync (removes ALL images to minimize size)
  const exportDataForSync = () => {
    try {
      // Remove ALL images from items (keep only text data)
      const optimizedItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available
        // image removed completely
      }));

      // Remove ALL media from settings (keep only text/config)
      const optimizedSettings = {
        name: settings.name,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        address: settings.address,
        openingHours: settings.openingHours,
        deliveryFee: settings.deliveryFee,
        minOrder: settings.minOrder,
        paymentMethods: settings.paymentMethods
        // All images and videos removed
      };

      const exportData = {
        categories: categories,
        items: optimizedItems,
        settings: optimizedSettings,
        orders: [], // Don't export orders for sync
        exportDate: new Date().toISOString(),
        version: '2.0',
        optimized: true
      };
      
      // Compress JSON (no formatting, single line)
      const dataStr = JSON.stringify(exportData);
      const sizeInKB = new Blob([dataStr]).size / 1024;
      
      // Split into chunks if too large (WhatsApp limit ~65KB per message)
      const maxChunkSize = 60000; // 60KB per chunk
      
      if (dataStr.length > maxChunkSize) {
        // Split into multiple chunks
        const chunks: string[] = [];
        const totalChunks = Math.ceil(dataStr.length / maxChunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * maxChunkSize;
          const end = start + maxChunkSize;
          chunks.push(dataStr.substring(start, end));
        }
        
        // Create a formatted message with all chunks
        let message = `📱 SINCRONIZAÇÃO DE DADOS\n\n`;
        message += `Total: ${totalChunks} parte(s)\n`;
        message += `Tamanho: ${sizeInKB.toFixed(2)} KB\n\n`;
        message += `⚠️ IMPORTANTE: Copie TODAS as partes abaixo e cole no celular usando o botão "Colar JSON em Partes"\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        chunks.forEach((chunk, index) => {
          message += `PARTE ${index + 1}/${totalChunks}:\n`;
          message += `${chunk}\n\n`;
          message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        });
        
        // Copy to clipboard
        navigator.clipboard.writeText(message).then(() => {
          alert(`Dados divididos em ${totalChunks} partes!\n\nTamanho total: ${sizeInKB.toFixed(2)} KB\n\nTodas as partes foram copiadas. Envie via WhatsApp e depois use o botão "Colar JSON em Partes" no celular.\n\nNota: Todas as imagens foram removidas para reduzir o tamanho.`);
        }).catch(() => {
          prompt('Copie esta mensagem completa:', message);
        });
      } else {
        // Single chunk - small enough
        navigator.clipboard.writeText(dataStr).then(() => {
          alert(`Dados otimizados copiados!\n\nTamanho: ${sizeInKB.toFixed(2)} KB\n\nCole no celular usando o botão "Colar JSON".\n\nNota: Todas as imagens foram removidas para reduzir o tamanho.`);
        }).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = dataStr;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            alert('Dados copiados! Agora cole no celular usando o botão "Colar JSON".');
          } catch (e) {
            prompt('Copie este texto:', dataStr);
          }
          document.body.removeChild(textarea);
        });
      }
    } catch (error) {
      console.error('Error exporting optimized data:', error);
      alert('Erro ao exportar dados otimizados. Tente novamente.');
    }
  };

  // Import data from multiple chunks (flexible - can paste multiple parts at once)
  const importFromChunks = () => {
    const collectedChunks: Map<number, string> = new Map();
    let totalChunks = 0;
    
    // Helper function to extract chunks from text
    const extractChunksFromText = (text: string): Map<number, string> => {
      const foundChunks: Map<number, string> = new Map();
      
      // Extract total chunks from header
      const totalMatch = text.match(/Total:\s*(\d+)/i);
      if (totalMatch && !totalChunks) {
        totalChunks = parseInt(totalMatch[1]);
      }
      
      // Extract each PARTE X/Y: chunk
      const parteRegex = /PARTE\s*(\d+)\/(\d+):\s*([\s\S]*?)(?=\n\n━━|PARTE\s*\d+\/|$)/gi;
      let match;
      
      while ((match = parteRegex.exec(text)) !== null) {
        const partNum = parseInt(match[1]);
        const totalParts = parseInt(match[2]);
        const chunkData = match[3].trim();
        
        if (!totalChunks) {
          totalChunks = totalParts;
        }
        
        if (chunkData && chunkData.length > 10) {
          foundChunks.set(partNum, chunkData);
        }
      }
      
      return foundChunks;
    };
    
    // First attempt: try to get everything at once
    let firstInput = prompt('Cole o máximo que conseguir do WhatsApp:\n\n(Pode ser o cabeçalho, uma parte, ou várias partes juntas)\n\nSe não conseguir copiar tudo, cole o que conseguir e depois continuaremos.');
    
    if (!firstInput) return;
    
    // Extract chunks from first input
    const firstChunks = extractChunksFromText(firstInput);
    firstChunks.forEach((chunk, partNum) => {
      collectedChunks.set(partNum, chunk);
    });
    
    // If we still don't know total, ask user
    if (!totalChunks) {
      const userInput = prompt(`Quantas partes no total? (veja no início da mensagem do WhatsApp)\n\nJá coletadas: ${collectedChunks.size}`);
      if (!userInput) return;
      totalChunks = parseInt(userInput) || collectedChunks.size;
    }
    
    // Continue collecting missing parts
    while (collectedChunks.size < totalChunks) {
      const missingParts: number[] = [];
      for (let i = 1; i <= totalChunks; i++) {
        if (!collectedChunks.has(i)) {
          missingParts.push(i);
        }
      }
      
      if (missingParts.length === 0) break;
      
      const missingList = missingParts.length <= 5 
        ? missingParts.join(', ')
        : `${missingParts.slice(0, 5).join(', ')}... (e mais ${missingParts.length - 5})`;
      
      const nextInput = prompt(`Faltam ${missingParts.length} parte(s): ${missingList}\n\nCole a(s) parte(s) que faltam:\n\n(Pode colar uma ou várias partes de uma vez)`);
      
      if (!nextInput) {
        const cancel = confirm(`Você cancelou. Deseja continuar com as ${collectedChunks.size} parte(s) já coletadas de ${totalChunks}?`);
        if (!cancel) return;
        break;
      }
      
      // Extract chunks from this input
      const newChunks = extractChunksFromText(nextInput);
      newChunks.forEach((chunk, partNum) => {
        collectedChunks.set(partNum, chunk);
      });
      
      // If no new chunks found, try to extract JSON directly
      if (newChunks.size === 0) {
        const jsonMatch = nextInput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // Try to guess which part this is based on missing parts
          const guessPart = missingParts[0];
          collectedChunks.set(guessPart, jsonMatch[0]);
        }
      }
    }
    
    if (collectedChunks.size === 0) {
      alert('Nenhuma parte foi coletada. Importação cancelada.');
      return;
    }
    
    // Reconstruct JSON in order
    const orderedChunks: string[] = [];
    for (let i = 1; i <= totalChunks; i++) {
      if (collectedChunks.has(i)) {
        orderedChunks.push(collectedChunks.get(i)!);
      }
    }
    
    // Combine all chunks
    const combinedData = orderedChunks.join('');
    
    // Show info before importing
    const info = `Coletadas ${collectedChunks.size} parte(s) de ${totalChunks} total.\n\nTamanho: ${(combinedData.length / 1024).toFixed(2)} KB\n\nContinuar com a importação?`;
    if (!confirm(info)) return;
    
    try {
      const importedData = JSON.parse(combinedData);
      processImportedData(importedData);
    } catch (error) {
      console.error('Error parsing combined chunks:', error);
      const missing = totalChunks - collectedChunks.size;
      alert(`Erro ao processar as partes.\n\nPartes coletadas: ${collectedChunks.size}/${totalChunks}${missing > 0 ? `\nFaltam: ${missing} parte(s)` : ''}\nTamanho: ${(combinedData.length / 1024).toFixed(2)} KB\n\nCertifique-se de que copiou todas as partes corretamente do WhatsApp.`);
    }
  };

  // Helper function to process imported data
  const processImportedData = (importedData: any) => {
    if (!importedData.categories || !importedData.items || !importedData.settings) {
      alert('Arquivo inválido. Certifique-se de que é um backup válido do sistema.');
      return false;
    }
    
    if (confirm('Isso substituirá TODOS os dados atuais pelos dados do arquivo. Continuar?')) {
      // Import data
      setCategories(importedData.categories || categories);
      setItems(importedData.items || items);
      setSettings(importedData.settings || settings);
      if (importedData.orders) {
        setOrders(importedData.orders || orders);
      }
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('minas_v2_categories', JSON.stringify(importedData.categories || categories));
        localStorage.setItem('minas_v2_items', JSON.stringify(importedData.items || items));
        localStorage.setItem('minas_v2_settings', JSON.stringify(importedData.settings || settings));
        if (importedData.orders) {
          localStorage.setItem('minas_v2_orders', JSON.stringify(importedData.orders || orders));
        }
        
        alert('Dados importados com sucesso! A página será recarregada.');
        setTimeout(() => window.location.reload(), 1000);
        return true;
      } catch (error) {
        console.error('Error saving imported data:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          alert('Armazenamento cheio! Alguns dados podem não ter sido salvos. Tente limpar o armazenamento primeiro.');
        } else {
          alert('Erro ao salvar dados importados. Tente novamente.');
        }
        return false;
      }
    }
    return false;
  };

  // Import data from JSON file
  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          processImportedData(importedData);
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Erro ao importar dados. Certifique-se de que o arquivo é um JSON válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Import data from pasted JSON
  const importFromPaste = () => {
    const jsonText = prompt('Cole o JSON exportado aqui:');
    if (!jsonText) return;
    
    try {
      const importedData = JSON.parse(jsonText);
      processImportedData(importedData);
    } catch (error) {
      console.error('Error parsing pasted JSON:', error);
      alert('Erro ao processar JSON. Certifique-se de que o texto está completo e válido.');
    }
  };

  return (
    <div className="min-h-screen font-sans bg-orange-50 text-stone-900 selection:bg-orange-200 selection:text-orange-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-orange-100">
        <div className="container mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.name || 'Logo'} className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-700 rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-lg shadow-orange-700/20 rotate-3 flex-shrink-0">
                {(settings.name || 'Sabor Fogão a Lenha').split(' ').filter(Boolean).map(n => n[0] || '').join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-sm sm:text-lg md:text-2xl font-black text-orange-900 leading-none tracking-tight mb-0.5 sm:mb-1 truncate">{settings.name || 'Sabor Fogão a Lenha'}</h1>
              <p className="text-[9px] sm:text-[11px] text-green-700 font-bold tracking-[0.2em] uppercase">Comida Caseira</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#menu" className="text-stone-600 hover:text-orange-700 font-bold text-sm uppercase tracking-widest transition-colors">Cardápio</a>
            <a href="#about" className="text-stone-600 hover:text-orange-700 font-bold text-sm uppercase tracking-widest transition-colors">Sobre</a>
            <a href="#contact" className="text-stone-600 hover:text-orange-700 font-bold text-sm uppercase tracking-widest transition-colors">Contato</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="group flex items-center gap-1 sm:gap-2 p-2 sm:p-3 text-stone-400 hover:text-orange-700 hover:bg-orange-50 rounded-xl sm:rounded-2xl transition-all border border-transparent hover:border-orange-100"
              title="Painel de Controle (Admin)"
            >
              <Settings size={18} className="sm:w-[22px] sm:h-[22px] group-hover:rotate-90 transition-transform duration-500" />
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Painel Admin</span>
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 sm:p-3 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl sm:rounded-2xl transition-all"
            >
              <ShoppingCart size={18} className="sm:w-[22px] sm:h-[22px]" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-md">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent z-10" />
        {settings.heroVideo ? (
          <video 
            key={`hero-video-${settings.heroVideo.substring(0, 50)}`}
            autoPlay 
            muted 
            loop 
            playsInline 
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover scale-105"
            src={settings.heroVideo}
            onError={(e) => {
              console.error('Error loading hero video:', e);
              // Fallback to image if video fails
              const videoElement = e.target as HTMLVideoElement;
              videoElement.style.display = 'none';
            }}
            onLoadedData={() => {
              console.log('Hero video loaded successfully');
            }}
          />
        ) : (
          <img 
            key={`hero-image-${settings.heroImage ? settings.heroImage.substring(0, 50) : 'default'}`}
            src={settings.heroImage || "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop"} 
            className="absolute inset-0 w-full h-full object-cover scale-105"
            alt="Restaurante"
            loading="eager"
            onError={(e) => {
              console.error('Error loading hero image:', e);
              // Fallback if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop";
            }}
            onLoad={() => {
              console.log('Hero image loaded successfully');
            }}
          />
        )}
        <div className="relative z-20 text-center text-white px-4 max-w-4xl">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-orange-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] rounded-full mb-4 sm:mb-6 shadow-xl"
          >
            Bem-vindo ao Interior
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black mb-4 sm:mb-6 md:mb-8 leading-[0.9] tracking-tighter px-2"
          >
            O sabor <span className="text-orange-400 underline decoration-orange-400/30 underline-offset-4 sm:underline-offset-8">autêntico</span> da Comida Caseira
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg md:text-xl lg:text-2xl mb-8 sm:mb-10 md:mb-12 font-medium text-stone-200 max-w-2xl mx-auto leading-relaxed px-2"
          >
            Pratos preparados com ingredientes frescos e muito amor.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full px-4"
          >
            <a 
              href="#menu" 
              className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-5 bg-orange-700 hover:bg-orange-800 text-white text-sm sm:text-lg font-black rounded-2xl sm:rounded-3xl transition-all shadow-2xl shadow-orange-700/40 hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
            >
              Ver Cardápio
            </a>
            <a 
              href="#contact" 
              className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm sm:text-lg font-black rounded-2xl sm:rounded-3xl transition-all border border-white/30 hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
            >
              Localização
            </a>
          </motion.div>
        </div>
      </section>

      {/* Categories Bar */}
      <div className="sticky top-16 sm:top-20 z-40 bg-orange-50/90 backdrop-blur-xl border-b border-orange-100 py-4 sm:py-6">
        <div className="container mx-auto px-3 sm:px-4 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveCategory('all')} 
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap transition-all ${
              activeCategory === 'all' 
                ? 'bg-orange-700 text-white shadow-xl shadow-orange-700/20 -translate-y-0.5' 
                : 'bg-white text-stone-400 hover:text-stone-800 hover:bg-orange-100'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)} 
              className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-orange-700 text-white shadow-xl shadow-orange-700/20 -translate-y-0.5' 
                  : 'bg-white text-stone-400 hover:text-stone-800 hover:bg-orange-100'
            }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <section id="menu" className="py-12 sm:py-16 md:py-24 container mx-auto px-3 sm:px-4">
        <div className="flex flex-col items-center mb-8 sm:mb-12 md:mb-16 text-center">
          <span className="text-orange-700 font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs mb-3 sm:mb-4">Seleção Especial</span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 tracking-tighter">Nosso Cardápio</h3>
          <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-orange-700 rounded-full mt-4 sm:mt-6" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id} 
                className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all overflow-hidden border border-orange-100 group flex flex-col h-full"
              >
                <div className="h-48 sm:h-64 md:h-72 relative overflow-hidden shrink-0">
                  <img 
                    key={`item-${item.id}-${item.image ? item.image.substring(0, 30) : 'no-image'}`}
                    src={item.image || "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=2070&auto=format&fit=crop"} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Error loading image for item ${item.name}:`, e);
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=2070&auto=format&fit=crop";
                    }}
                    onLoad={() => {
                      console.log(`Image loaded for item: ${item.name}`);
                    }}
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white font-black uppercase tracking-widest text-sm sm:text-lg px-4 sm:px-6 py-1.5 sm:py-2 border-2 border-white/30 rounded-full">Esgotado</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-white/95 backdrop-blur shadow-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-orange-700 text-sm sm:text-lg">
                    {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="p-4 sm:p-6 md:p-8 flex flex-col flex-1">
                  <h4 className="text-lg sm:text-xl md:text-2xl font-black text-stone-900 mb-2 sm:mb-3 group-hover:text-orange-700 transition-colors">{item.name}</h4>
                  <p className="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6 md:mb-8 leading-relaxed line-clamp-3">{item.description}</p>
                  <button 
                    onClick={() => addToCart(item)} 
                    disabled={!item.available} 
                    className="mt-auto w-full bg-stone-50 hover:bg-orange-700 text-stone-800 hover:text-white font-black py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-[1.5rem] transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-30 disabled:cursor-not-allowed group/btn text-xs sm:text-sm"
                  >
                    <Plus size={16} className="sm:w-5 sm:h-5 group-hover/btn:rotate-90 transition-transform" /> 
                    ADICIONAR
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-24 md:py-32 bg-stone-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-700/5 rotate-12 translate-x-1/2" />
        <div className="container mx-auto px-3 sm:px-4 grid md:grid-cols-2 gap-12 sm:gap-16 md:gap-24 items-center relative z-10">
          <div>
            <span className="text-orange-400 font-black tracking-[0.3em] uppercase text-[10px] sm:text-xs mb-4 sm:mb-6 block">Tradição & Família</span>
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 sm:mb-8 tracking-tighter leading-[0.9]">Sabor e dedicação em cada detalhe</h3>
            <p className="text-stone-400 text-base sm:text-lg md:text-xl leading-relaxed mb-8 sm:mb-10 md:mb-12 font-medium">
              O restaurante Sabor Fogão a Lenha nasceu do desejo de trazer os sabores autêntico da comida caseira.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-10">
              <div className="p-4 sm:p-6 md:p-8 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                <span className="block text-2xl sm:text-3xl md:text-4xl font-black text-orange-400 mb-1 sm:mb-2">10+</span>
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Anos de Tradição</span>
              </div>
              <div className="p-4 sm:p-6 md:p-8 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                <span className="block text-2xl sm:text-3xl md:text-4xl font-black text-orange-400 mb-1 sm:mb-2">100%</span>
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Ingredientes Locais</span>
              </div>
            </div>
          </div>
          <div className="relative group mt-8 md:mt-0">
            <div className="absolute -inset-4 bg-orange-700/20 blur-[100px] rounded-full group-hover:bg-orange-700/30 transition-all duration-700" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 relative">
              <img 
                key={`about-1-${settings.aboutImage1 ? settings.aboutImage1.substring(0, 30) : 'default'}`}
                src={settings.aboutImage1 || "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop"} 
                className="rounded-2xl sm:rounded-3xl h-[200px] sm:h-[300px] md:h-[400px] lg:h-[450px] w-full object-cover shadow-2xl rotate-3" 
                alt="Ambiente"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop";
                }}
              />
              <img 
                key={`about-2-${settings.aboutImage2 ? settings.aboutImage2.substring(0, 30) : 'default'}`}
                src={settings.aboutImage2 || "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=2069&auto=format&fit=crop"} 
                className="rounded-2xl sm:rounded-3xl h-[200px] sm:h-[300px] md:h-[400px] lg:h-[450px] w-full object-cover shadow-2xl -rotate-3 mt-6 sm:mt-8 md:mt-12" 
                alt="Comida"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=2069&auto=format&fit=crop";
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 sm:py-20 md:py-32 bg-white">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-10 md:gap-16">
            <div className="p-6 sm:p-8 md:p-12 bg-stone-50 rounded-2xl sm:rounded-3xl text-center border border-stone-100 hover:border-orange-200 transition-colors group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-orange-700 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                <Phone size={24} className="sm:w-8 sm:h-8" />
              </div>
              <h4 className="font-black text-xl sm:text-2xl mb-3 sm:mb-4 tracking-tight">Contato</h4>
              <p className="text-stone-500 font-bold mb-1 text-sm sm:text-base">{settings.phone || '(00) 0000-0000'}</p>
              <p className="text-orange-700 font-black text-sm sm:text-base">{settings.whatsapp || '(00) 00000-0000'}</p>
            </div>
            <div className="p-6 sm:p-8 md:p-12 bg-stone-50 rounded-2xl sm:rounded-3xl text-center border border-stone-100 hover:border-orange-200 transition-colors group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-green-700 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                <MapPin size={24} className="sm:w-8 sm:h-8" />
              </div>
              <h4 className="font-black text-xl sm:text-2xl mb-3 sm:mb-4 tracking-tight">Endereço</h4>
              <p className="text-stone-500 font-medium leading-relaxed text-sm sm:text-base">{settings.address || 'Endereço não informado'}</p>
            </div>
            <div className="p-6 sm:p-8 md:p-12 bg-stone-50 rounded-2xl sm:rounded-3xl text-center border border-stone-100 hover:border-orange-200 transition-colors group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-amber-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                <Clock size={24} className="sm:w-8 sm:h-8" />
              </div>
              <h4 className="font-black text-xl sm:text-2xl mb-3 sm:mb-4 tracking-tight">Horários</h4>
              <div className="space-y-1">
                {Object.entries(settings.openingHours || {}).map(([day, hours]) => (
                  <p key={day} className="text-stone-500 font-medium text-xs sm:text-sm">
                    <span className="font-black text-stone-800 uppercase text-[9px] sm:text-[10px] tracking-widest mr-2">{day}:</span>
                    {hours}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-orange-50 py-12 sm:py-16 md:py-24 border-t border-orange-100">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-3 sm:mb-4 tracking-tighter">{settings.name || 'Sabor Fogão a Lenha'}</h2>
          <p className="text-stone-500 font-medium max-w-lg mx-auto mb-8 sm:mb-12 leading-relaxed text-sm sm:text-base">O melhor da culinária mineira direto para sua mesa, com o tempero que você só encontra no interior.</p>
          <div className="flex justify-center gap-6 sm:gap-8 md:gap-10 mb-12 sm:mb-16 flex-wrap">
            <a href="#" className="text-stone-400 hover:text-orange-700 font-black uppercase text-xs tracking-[0.2em] transition-colors">Instagram</a>
            <a href="#" className="text-stone-400 hover:text-orange-700 font-black uppercase text-xs tracking-[0.2em] transition-colors">Facebook</a>
            <a href="#" className="text-stone-400 hover:text-orange-700 font-black uppercase text-xs tracking-[0.2em] transition-colors">Twitter</a>
          </div>
          <div className="pt-12 border-t border-orange-200/50">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">© 2026 {settings.name || 'Sabor Fogão a Lenha'}. Feito com paixão mineira.</p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button - WhatsApp */}
      <a 
        href={`https://wa.me/${(settings.whatsapp || '').replace(/\D/g, '')}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-10 right-10 z-[100] bg-green-600 hover:bg-green-700 text-white p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(22,101,52,0.4)] hover:shadow-[0_20px_50px_rgba(22,101,52,0.6)] transition-all hover:-translate-y-2 active:scale-95 group"
      >
        <MessageCircle size={32} />
        <span className="absolute right-full mr-6 top-1/2 -translate-y-1/2 bg-stone-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pointer-events-none whitespace-nowrap shadow-2xl">
          Peça pelo WhatsApp
        </span>
      </a>

      {/* Admin Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl" 
              onClick={() => setIsAdminOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative w-full max-w-7xl bg-white rounded-2xl sm:rounded-[3rem] h-full max-h-[900px] flex flex-col shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-4 sm:p-6 md:p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-700 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3 flex-shrink-0">
                    <Settings size={24} className="sm:w-8 sm:h-8" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tighter truncate">Painel de Controle</h3>
                    <p className="text-stone-400 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1 hidden sm:block">Gestão Administrativa do Restaurante</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdminOpen(false)} 
                  className="w-10 h-10 sm:w-14 sm:h-14 bg-white hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-xl sm:rounded-2xl transition-all shadow-xl flex items-center justify-center active:scale-90 flex-shrink-0"
                >
                  <X size={20} className="sm:w-7 sm:h-7" />
                </button>
              </div>

              {/* Mobile Tabs - Horizontal */}
              <div className="md:hidden border-b border-stone-100 bg-stone-50/30 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 p-3">
                  {[
                    { id: 'orders', icon: ShoppingCart, label: 'Pedidos' },
                    { id: 'items', icon: MenuIcon, label: 'Cardápio' },
                    { id: 'categories', icon: Plus, label: 'Categorias' },
                    { id: 'settings', icon: Settings, label: 'Configurações' }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id as 'items' | 'categories' | 'orders' | 'settings')} 
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                        adminTab === tab.id 
                          ? 'bg-orange-700 text-white shadow-lg shadow-orange-700/30' 
                          : 'text-stone-400 hover:text-stone-800 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <tab.icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                        <span className={`${adminTab === tab.id ? 'bg-white text-orange-700' : 'bg-orange-700 text-white'} w-5 h-5 rounded-full flex items-center justify-center text-[9px] shadow-lg`}>
                          {orders.filter(o => o.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-80 border-r border-stone-100 p-8 flex-col gap-3 bg-stone-50/30">
                  {[
                    { id: 'orders', icon: ShoppingCart, label: 'Pedidos' },
                    { id: 'items', icon: MenuIcon, label: 'Cardápio' },
                    { id: 'categories', icon: Plus, label: 'Categorias' },
                    { id: 'settings', icon: Settings, label: 'Configurações' }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id as 'items' | 'categories' | 'orders' | 'settings')} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${
                        adminTab === tab.id 
                          ? 'bg-orange-700 text-white shadow-2xl shadow-orange-700/30 -translate-y-0.5' 
                          : 'text-stone-400 hover:text-stone-800 hover:bg-white hover:shadow-lg'
                      }`}
                    >
                      <tab.icon size={20} />
                      {tab.label}
                      {tab.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                        <span className="ml-auto bg-white text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg">
                          {orders.filter(o => o.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  ))}
                  
                  <div className="mt-auto pt-8 border-t border-stone-100">
                    <button 
                      onClick={() => setIsAdminOpen(false)}
                      className="w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest text-red-500 hover:bg-red-50 transition-all"
                    >
                      <LogOut size={20} /> Sair do Painel
                    </button>
                  </div>
                </aside>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 bg-white">
                  {adminTab === 'orders' && (
                    <div className="space-y-10">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-4xl font-black text-stone-900 tracking-tighter mb-2">Pedidos Recebidos</h4>
                          <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Acompanhe e gerencie as solicitações</p>
                        </div>
                      </div>
                      
                      {orders.length === 0 ? (
                        <div className="py-32 flex flex-col items-center justify-center bg-stone-50 rounded-[3rem] border-4 border-dashed border-stone-100 text-stone-300">
                          <ShoppingCart size={80} strokeWidth={1} className="mb-6 opacity-20" />
                          <p className="font-black uppercase tracking-[0.2em] text-sm">Nenhum pedido no momento</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {orders.map(order => (
                            <div key={order.id} className="p-8 bg-white border border-stone-100 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] transition-all">
                              <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
                                <div>
                                  <div className="flex items-center gap-4 mb-2">
                                    <span className="font-black text-2xl tracking-tighter">#{order.id}</span>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                      order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                      order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {order.status === 'pending' ? 'Pendente' :
                                       order.status === 'preparing' ? 'Preparando' :
                                       order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                                    </span>
                                  </div>
                                  <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-black text-orange-700 tracking-tighter">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">{order.paymentMethod}</p>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-12 py-8 border-y border-stone-50">
                                <div className="space-y-4">
                                  <h5 className="font-black text-stone-900 uppercase text-xs tracking-widest flex items-center gap-3">
                                    <MessageCircle size={14} className="text-orange-700" /> Detalhes do Cliente
                                  </h5>
                                  <div>
                                    <p className="font-black text-lg text-stone-900">{order.customerName}</p>
                                    <p className="text-stone-500 font-bold">{order.customerPhone}</p>
                                    <div className="flex items-start gap-2 mt-4 text-stone-400">
                                      <MapPin size={16} className="shrink-0 mt-1" />
                                      <p className="text-sm font-medium leading-relaxed">{order.address}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h5 className="font-black text-stone-900 uppercase text-xs tracking-widest flex items-center gap-3">
                                    <MenuIcon size={14} className="text-orange-700" /> Itens do Pedido
                                  </h5>
                                  <div className="space-y-2">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl">
                                        <span className="font-bold text-stone-800">{item.quantity}x <span className="font-medium text-stone-500">{item.item.name}</span></span>
                                        <span className="font-black text-stone-900">{(item.item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-3 mt-8">
                                {order.status === 'pending' && (
                                  <button 
                                    onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, status: 'preparing'} : o))}
                                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                                  >
                                    Iniciar Preparo
                                  </button>
                                )}
                                {order.status === 'preparing' && (
                                  <button 
                                    onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, status: 'delivered'} : o))}
                                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-600/20 transition-all active:scale-95"
                                  >
                                    Confirmar Entrega
                                  </button>
                                )}
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, status: 'cancelled'} : o))}
                                    className="px-8 py-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === 'items' && (
                    <div className="space-y-10">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-4xl font-black text-stone-900 tracking-tighter mb-2">Gerenciar Cardápio</h4>
                          <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Adicione e edite seus pratos</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (categories.length === 0) {
                              alert('Por favor, crie uma categoria primeiro!');
                              return;
                            }
                            setNewItemForm({ name: '', price: '', description: '', category: categories[0]?.id || '' });
                            setIsNewItemModalOpen(true);
                          }}
                          className="px-8 py-4 bg-orange-700 hover:bg-orange-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-700/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                          <Plus size={20} /> Novo Item
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {items.map(item => (
                          <div key={item.id} className="p-6 bg-white border border-stone-100 rounded-[2rem] flex flex-wrap items-center gap-8 shadow-sm group">
                            <div className="w-24 h-24 bg-stone-100 rounded-3xl overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                              <img src={item.image || "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-4 mb-2">
                                <h5 className="font-black text-xl text-stone-900">{item.name}</h5>
                                <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-black uppercase text-[10px] tracking-widest">
                                  {categories.find(c => c.id === item.category)?.name}
                                </span>
                              </div>
                              <p className="text-stone-400 text-sm line-clamp-1 font-medium">{item.description}</p>
                              <p className="text-orange-700 font-black text-lg mt-2">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end mr-4">
                                <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Disponível</span>
                                <button 
                                  onClick={() => setItems(items.map(i => i.id === item.id ? {...i, available: !i.available} : i))}
                                  className={`w-14 h-8 rounded-full transition-all relative ${item.available ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-stone-200'}`}
                                >
                                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${item.available ? 'left-7' : 'left-1'}`} />
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      // Check file size (max 5MB before compression)
                                      if (file.size > 5 * 1024 * 1024) {
                                        alert('Imagem muito grande! Por favor, escolha uma imagem menor que 5MB.');
                                        return;
                                      }
                                      try {
                                        await handleFileUpload(file, (base64) => {
                                          setItems(items.map(i => i.id === item.id ? {...i, image: base64} : i));
                                          // Show success feedback
                                          const button = e.target as HTMLElement;
                                          const originalTitle = button.getAttribute('title');
                                          button.setAttribute('title', 'Imagem salva!');
                                          setTimeout(() => {
                                            button.setAttribute('title', originalTitle || 'Trocar Imagem');
                                          }, 2000);
                                        });
                                      } catch (error) {
                                        console.error('Error uploading image:', error);
                                        alert('Erro ao fazer upload da imagem. Tente novamente.');
                                      }
                                    }
                                  };
                                  input.click();
                                }}
                                className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-2xl transition-all"
                                title="Trocar Imagem"
                              >
                                <Upload size={22} />
                              </button>
                              <button 
                                onClick={() => {
                                  const newName = prompt('Novo nome:', item.name);
                                  if (newName) setItems(items.map(i => i.id === item.id ? {...i, name: newName} : i));
                                }}
                                className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-orange-700 hover:bg-orange-50 rounded-2xl transition-all"
                                title="Editar Nome"
                              >
                                <Edit size={22} />
                              </button>
                              <button 
                                onClick={() => {
                                  const newPrice = prompt('Novo preço (R$):', item.price.toString());
                                  if (newPrice) {
                                    const price = parseFloat(newPrice.replace(',', '.'));
                                    if (!isNaN(price) && price >= 0) {
                                      setItems(items.map(i => i.id === item.id ? {...i, price} : i));
                                    } else {
                                      alert('Preço inválido. Use apenas números.');
                                    }
                                  }
                                }}
                                className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                title="Editar Preço"
                              >
                                <CreditCard size={22} />
                              </button>
                              <button 
                                onClick={() => {
                                  const newDescription = prompt('Nova descrição:', item.description);
                                  if (newDescription !== null) {
                                    setItems(items.map(i => i.id === item.id ? {...i, description: newDescription} : i));
                                  }
                                }}
                                className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all"
                                title="Editar Descrição"
                              >
                                <MessageCircle size={22} />
                              </button>
                              <button 
                                onClick={() => setItems(items.filter(i => i.id !== item.id))}
                                className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                title="Excluir Item"
                              >
                                <Trash2 size={22} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {adminTab === 'categories' && (
                    <div className="space-y-10">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-4xl font-black text-stone-900 tracking-tighter mb-2">Categorias</h4>
                          <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Organize seu cardápio em seções</p>
                        </div>
                        <button 
                          onClick={() => {
                            const name = prompt('Nome da categoria:');
                            if (name) setCategories([...categories, { id: generateId(), name }]);
                          }}
                          className="px-8 py-4 bg-orange-700 hover:bg-orange-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-700/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                          <Plus size={20} /> Nova Categoria
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(cat => (
                          <div key={cat.id} className="p-8 bg-white border border-stone-100 rounded-[2.5rem] flex items-center justify-between shadow-sm group hover:border-orange-200 transition-colors">
                            <span className="font-black text-lg text-stone-900 tracking-tight">{cat.name}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const newName = prompt('Novo nome:', cat.name);
                                  if (newName) setCategories(categories.map(c => c.id === cat.id ? {...c, name: newName} : c));
                                }}
                                className="w-10 h-10 flex items-center justify-center text-stone-300 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => setCategories(categories.filter(c => c.id !== cat.id))}
                                className="w-10 h-10 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {adminTab === 'settings' && (
                    <div className="max-w-3xl space-y-6 sm:space-y-12">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tighter mb-2">Configurações</h4>
                          <p className="text-stone-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">Informações públicas do restaurante</p>
                        </div>
                        {/* Mobile Sair Button */}
                        <button 
                          onClick={() => setIsAdminOpen(false)}
                          className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-50 transition-all"
                        >
                          <LogOut size={16} /> Sair
                        </button>
                        <div className="flex gap-2 sm:gap-4">
                          <button 
                            onClick={() => {
                              localStorage.setItem('minas_v2_settings', JSON.stringify(settings));
                              localStorage.setItem('minas_v2_categories', JSON.stringify(categories));
                              localStorage.setItem('minas_v2_items', JSON.stringify(items));
                              alert('Todas as alterações foram salvas com sucesso!');
                            }}
                            className="px-4 sm:px-8 py-2 sm:py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-green-600/20 transition-all active:scale-95 flex items-center gap-2 text-[10px] sm:text-xs"
                          >
                            <Save size={14} className="sm:w-[18px] sm:h-[18px]" /> Salvar Tudo
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <ImageIcon size={14} className="text-orange-700" /> Logo da Marca
                            </label>
                            <div className="flex items-center gap-6 p-6 bg-stone-50/50 rounded-3xl border border-stone-100">
                              <div className="w-20 h-20 bg-white rounded-2xl border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                                {settings.logo ? (
                                  <img src={settings.logo} className="w-full h-full object-contain" alt="Logo" />
                                ) : (
                                  <ImageIcon size={24} className="text-stone-200" />
                                )}
                              </div>
                              <div className="flex-1 space-y-3">
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        handleFileUpload(file, (base) => {
                                          const updatedSettings = {...settings, logo: base};
                                          setSettings(updatedSettings);
                                          // Force immediate save
                                          try {
                                            localStorage.setItem('minas_v2_settings', JSON.stringify(updatedSettings));
                                          } catch (e) {
                                            console.error('Error saving logo:', e);
                                          }
                                        });
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="w-full py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                  <Upload size={14} /> {settings.logo ? 'Trocar Logo' : 'Enviar Logo'}
                                </button>
                                {settings.logo && (
                                  <button 
                                    onClick={() => setSettings({...settings, logo: ''})}
                                    className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <Video size={14} className="text-orange-700" /> Vídeo Promocional (Hero)
                            </label>
                            <div className="flex items-center gap-6 p-6 bg-stone-50/50 rounded-3xl border border-stone-100 h-[128px]">
                              <div className="flex-1 space-y-3 text-center">
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'video/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        // Check file size (base64 is ~33% larger, so 10MB file becomes ~13MB)
                                        if (file.size > 10 * 1024 * 1024) { // 10MB limit before base64 conversion
                                          alert('O vídeo deve ter menos de 10MB antes da conversão. Vídeos maiores podem não ser salvos corretamente.');
                                        }
                                        handleFileUpload(file, (base) => {
                                          // Check base64 size
                                          const base64SizeMB = base.length / 1024 / 1024;
                                          if (base64SizeMB > 8) {
                                            alert(`Atenção: O vídeo convertido tem ${base64SizeMB.toFixed(2)}MB. Pode não ser salvo se o armazenamento estiver cheio.`);
                                          }
                                          const updatedSettings = {...settings, heroVideo: base};
                                          setSettings(updatedSettings);
                                          // Force immediate save with automatic cleanup
                                          try {
                                            localStorage.setItem('minas_v2_settings', JSON.stringify(updatedSettings));
                                          } catch (e) {
                                            console.error('Error saving hero video:', e);
                                            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                                              // Try automatic cleanup
                                              try {
                                                // Remove old orders (keep only last 5)
                                                const currentOrders = orders;
                                                if (currentOrders.length > 5) {
                                                  const recentOrders = currentOrders.slice(0, 5);
                                                  localStorage.setItem('minas_v2_orders', JSON.stringify(recentOrders));
                                                  setOrders(recentOrders);
                                                  console.log('Cleaned old orders to free space');
                                                }
                                                
                                                // Remove large images from items
                                                const cleanedItems = items.map(item => ({
                                                  ...item,
                                                  image: item.image && item.image.length > 500000 ? undefined : item.image
                                                }));
                                                localStorage.setItem('minas_v2_items', JSON.stringify(cleanedItems));
                                                setItems(cleanedItems);
                                                console.log('Cleaned large images from items');
                                                
                                                // Try saving video again
                                                localStorage.setItem('minas_v2_settings', JSON.stringify(updatedSettings));
                                                console.log('Video saved after automatic cleanup');
                                                alert('Vídeo salvo! Alguns dados antigos foram removidos automaticamente para liberar espaço.');
                                              } catch (retryError) {
                                                console.error('Failed even after cleanup:', retryError);
                                                alert('Armazenamento cheio! Não foi possível salvar o vídeo. Vá em Configurações > Limpar Armazenamento para liberar espaço.');
                                              }
                                            }
                                          }
                                        });
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="w-full py-4 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                  <Video size={14} /> {settings.heroVideo ? 'Trocar Vídeo' : 'Enviar Vídeo Local'}
                                </button>
                                {settings.heroVideo && (
                                  <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Vídeo Carregado com Sucesso</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <ImageIcon size={14} className="text-orange-700" /> Imagem do Topo (Hero)
                            </label>
                            <div className="flex items-center gap-6 p-6 bg-stone-50/50 rounded-3xl border border-stone-100 h-[128px]">
                              <div className="flex-1 space-y-3 text-center">
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        try {
                                          await handleFileUpload(file, (base) => {
                                            const newSettings = {...settings, heroImage: base};
                                            setSettings(newSettings);
                                            // Force immediate save
                                            try {
                                              localStorage.setItem('minas_v2_settings', JSON.stringify(newSettings));
                                            } catch (e) {
                                              console.error('Error saving hero image:', e);
                                            }
                                          });
                                        } catch (error) {
                                          console.error('Error uploading hero image:', error);
                                          alert('Erro ao fazer upload da imagem. Tente novamente.');
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="w-full py-4 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                  <Upload size={14} /> {settings.heroImage ? 'Trocar Imagem Hero' : 'Enviar Imagem Hero'}
                                </button>
                                {settings.heroImage && (
                                  <button onClick={() => setSettings({...settings, heroImage: ''})} className="text-[9px] text-red-500 font-bold uppercase tracking-widest hover:underline">Remover</button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <ImageIcon size={14} className="text-orange-700" /> Imagens "Sobre Nós"
                            </label>
                            <div className="flex flex-col gap-3 p-6 bg-stone-50/50 rounded-3xl border border-stone-100">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        handleFileUpload(file, (base) => {
                                          const updatedSettings = {...settings, aboutImage1: base};
                                          setSettings(updatedSettings);
                                          // Force immediate save
                                          try {
                                            localStorage.setItem('minas_v2_settings', JSON.stringify(updatedSettings));
                                          } catch (e) {
                                            console.error('Error saving aboutImage1:', e);
                                          }
                                        });
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="flex-1 py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                >
                                  Img 1 {settings.aboutImage1 ? '✓' : '+'}
                                </button>
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        handleFileUpload(file, (base) => {
                                          const updatedSettings = {...settings, aboutImage2: base};
                                          setSettings(updatedSettings);
                                          // Force immediate save
                                          try {
                                            localStorage.setItem('minas_v2_settings', JSON.stringify(updatedSettings));
                                          } catch (e) {
                                            console.error('Error saving aboutImage2:', e);
                                          }
                                        });
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="flex-1 py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                >
                                  Img 2 {settings.aboutImage2 ? '✓' : '+'}
                                </button>
                              </div>
                              {(settings.aboutImage1 || settings.aboutImage2) && (
                                <button onClick={() => setSettings({...settings, aboutImage1: '', aboutImage2: ''})} className="text-[9px] text-red-500 font-bold uppercase tracking-widest hover:underline text-center">Remover Ambas</button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Nome do Estabelecimento</label>
                          <input 
                            value={settings.name}
                            onChange={(e) => setSettings({...settings, name: e.target.value})}
                            className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 focus:border-orange-700/20 bg-stone-50/50 font-black text-lg text-stone-900 transition-all"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Telefone Fixo</label>
                            <input 
                              value={settings.phone}
                              onChange={(e) => setSettings({...settings, phone: e.target.value})}
                              className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-bold text-stone-900"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">WhatsApp Business</label>
                            <input 
                              value={settings.whatsapp}
                              onChange={(e) => setSettings({...settings, whatsapp: e.target.value})}
                              className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-bold text-stone-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Endereço Completo</label>
                          <input 
                            value={settings.address}
                            onChange={(e) => setSettings({...settings, address: e.target.value})}
                            className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-bold text-stone-900"
                          />
                        </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 bg-stone-50/50 rounded-[2rem] border border-stone-100 space-y-4">
                              <label className="flex items-center gap-3 text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">
                                <Truck size={14} className="text-orange-700" /> Taxa de Entrega
                              </label>
                              <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-stone-400">R$</span>
                                <input 
                                  type="number"
                                  value={settings.deliveryFee}
                                  onChange={(e) => setSettings({...settings, deliveryFee: parseFloat(e.target.value) || 0})}
                                  className="w-full pl-14 pr-8 py-5 rounded-2xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-white font-black text-stone-900"
                                />
                              </div>
                            </div>
                            <div className="p-8 bg-stone-50/50 rounded-[2rem] border border-stone-100 space-y-4">
                              <label className="flex items-center gap-3 text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">
                                <ShoppingCart size={14} className="text-orange-700" /> Pedido Mínimo
                              </label>
                              <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-stone-400">R$</span>
                                <input 
                                  type="number"
                                  value={settings.minOrder}
                                  onChange={(e) => setSettings({...settings, minOrder: parseFloat(e.target.value) || 0})}
                                  className="w-full pl-14 pr-8 py-5 rounded-2xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-white font-black text-stone-900"
                                />
                              </div>
                            </div>
                          </div>

                        <div className="space-y-6">
                          <label className="flex items-center gap-3 text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">
                            <CreditCard size={14} className="text-orange-700" /> Meios de Pagamento
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Vale Refeição'].map(method => (
                              <button 
                                key={method}
                                onClick={() => {
                                  const currentMethods = settings.paymentMethods || [];
                                  const exists = currentMethods.includes(method);
                                  const newMethods = exists 
                                    ? currentMethods.filter(m => m !== method)
                                    : [...currentMethods, method];
                                  setSettings({...settings, paymentMethods: newMethods});
                                }}
                                className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                  (settings.paymentMethods || []).includes(method) 
                                    ? 'bg-orange-700 text-white shadow-xl shadow-orange-700/20' 
                                    : 'bg-stone-50 text-stone-400 hover:bg-stone-100 border border-stone-100'
                                }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 sm:pt-12 border-t border-stone-100 space-y-6 sm:space-y-8">
                        <div>
                          <h5 className="text-lg sm:text-xl font-black text-stone-900 mb-4 uppercase tracking-widest text-xs">Sincronização de Dados</h5>
                          <div className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <button 
                                onClick={exportData}
                                className="px-4 sm:px-8 py-3 sm:py-5 bg-green-50 text-green-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-green-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm"
                                title="Exporta todos os dados completos (arquivo grande)"
                              >
                                <Save size={14} className="sm:w-4 sm:h-4" /> Backup Completo
                              </button>
                              <button 
                                onClick={importData}
                                className="px-4 sm:px-8 py-3 sm:py-5 bg-purple-50 text-purple-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-purple-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm"
                              >
                                <Upload size={14} className="sm:w-4 sm:h-4" /> Importar Arquivo
                              </button>
                            </div>
                            <button 
                              onClick={exportDataForSync}
                              className="w-full px-4 sm:px-8 py-3 sm:py-5 bg-orange-50 text-orange-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-orange-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm border-2 border-orange-200"
                            >
                              <MessageCircle size={14} className="sm:w-4 sm:h-4" /> 📱 Copiar para Celular (Otimizado)
                            </button>
                            <button 
                              onClick={importFromPaste}
                              className="w-full px-4 sm:px-8 py-3 sm:py-5 bg-blue-50 text-blue-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <MessageCircle size={14} className="sm:w-4 sm:h-4" /> Colar JSON (Texto Único)
                            </button>
                            <button 
                              onClick={importFromChunks}
                              className="w-full px-4 sm:px-8 py-3 sm:py-5 bg-indigo-50 text-indigo-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm border-2 border-indigo-200"
                            >
                              <MessageCircle size={14} className="sm:w-4 sm:h-4" /> 📱 Colar JSON em Partes (WhatsApp)
                            </button>
                            <p className="text-[10px] sm:text-xs text-stone-400 text-center px-2">
                              💡 <strong>Para WhatsApp:</strong> Use "Copiar para Celular" no PC (divide automaticamente), depois "Colar JSON em Partes" no celular. Todas as imagens são removidas para reduzir tamanho.
                            </p>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-lg sm:text-xl font-black text-stone-900 mb-4 uppercase tracking-widest text-xs">Manutenção</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <button 
                              onClick={() => {
                                if (confirm('Isso limpará pedidos antigos e imagens grandes para liberar espaço, mas manterá suas configurações. Continuar?')) {
                                  try {
                                    // Keep only last 5 orders
                                    const recentOrders = orders.slice(0, 5);
                                    localStorage.setItem('minas_v2_orders', JSON.stringify(recentOrders));
                                    setOrders(recentOrders);
                                    
                                    // Remove large images from items
                                    const cleanedItems = items.map(item => ({
                                      ...item,
                                      image: item.image && item.image.length > 500000 ? undefined : item.image
                                    }));
                                    localStorage.setItem('minas_v2_items', JSON.stringify(cleanedItems));
                                    setItems(cleanedItems);
                                    
                                    // Remove old localStorage keys
                                    const oldKeys = ['minas_settings', 'minas_categories', 'minas_items', 'minas_orders'];
                                    oldKeys.forEach(key => localStorage.removeItem(key));
                                    
                                    alert('Armazenamento limpo! Pedidos antigos e imagens grandes foram removidos.');
                                  } catch (error) {
                                    console.error('Error cleaning storage:', error);
                                    alert('Erro ao limpar armazenamento. Tente novamente.');
                                  }
                                }
                              }}
                              className="px-4 sm:px-8 py-3 sm:py-5 bg-blue-50 text-blue-600 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-blue-100 transition-all active:scale-95 text-xs sm:text-sm"
                            >
                              Limpar Armazenamento
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Isso apagará TODAS as suas personalizações e voltará aos dados padrão. Continuar?')) {
                                  localStorage.clear();
                                  window.location.reload();
                                }
                              }}
                              className="px-4 sm:px-8 py-3 sm:py-5 bg-red-50 text-red-500 font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] hover:bg-red-100 transition-all active:scale-95 text-xs sm:text-sm"
                            >
                              Resetar Tudo
                            </button>
                          </div>
                        </div>

                        <div>
                          <button 
                            onClick={() => {
                              localStorage.setItem('minas_v2_settings', JSON.stringify(settings));
                              localStorage.setItem('minas_v2_categories', JSON.stringify(categories));
                              localStorage.setItem('minas_v2_items', JSON.stringify(items));
                              alert('Todas as alterações foram salvas com sucesso!');
                            }}
                            className="w-full px-6 sm:px-12 py-4 sm:py-6 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-xl sm:rounded-[1.5rem] shadow-2xl shadow-green-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base"
                          >
                            <Save size={18} className="sm:w-5 sm:h-5" /> Salvar Todas as Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-end sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsCartOpen(false)} 
              className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-xl bg-white h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] flex flex-col shadow-2xl overflow-hidden border-l border-white/20"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 flex-shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-orange-700 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
                    <ShoppingCart size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Seu Pedido</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="w-12 h-12 bg-white hover:bg-red-50 text-stone-300 hover:text-red-500 rounded-2xl transition-all shadow-lg flex items-center justify-center"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar min-h-0">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-24 h-24 bg-stone-50 text-stone-200 rounded-[2rem] flex items-center justify-center mb-8">
                      <ShoppingCart size={48} strokeWidth={1} />
                    </div>
                    <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-sm mb-6">Carrinho Vazio</p>
                    <button onClick={() => setIsCartOpen(false)} className="text-orange-700 font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-8">Voltar ao Cardápio</button>
                  </div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div key={item.id} className="p-6 bg-stone-50/50 border border-stone-100 rounded-[2rem] flex items-center gap-6 group hover:bg-white hover:shadow-xl transition-all">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                        <img src={item.image || "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-black text-stone-900 tracking-tight">{item.name}</h5>
                        <p className="text-orange-700 font-black mt-1">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-stone-100">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-orange-700 transition-colors"><Minus size={16} strokeWidth={3}/></button>
                        <span className="font-black text-stone-900 w-4 text-center">{quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-orange-700 transition-colors"><Plus size={16} strokeWidth={3}/></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-10 bg-stone-50 border-t border-stone-100 space-y-8 flex-shrink-0 overflow-y-auto max-h-[50vh]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-stone-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                      <span>Subtotal</span>
                      <span>{cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-stone-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                      <span>Entrega</span>
                      <span>{(settings.deliveryFee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-stone-200">
                      <span className="text-stone-900 font-black text-2xl tracking-tighter uppercase">Total</span>
                      <span className="text-orange-700 font-black text-4xl tracking-tighter">
                        {(cartTotal + (settings.deliveryFee || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {!isCheckoutOpen ? (
                    <button 
                      onClick={() => setIsCheckoutOpen(true)} 
                      className="w-full bg-orange-700 hover:bg-orange-800 text-white font-black py-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(194,65,12,0.3)] hover:shadow-[0_20px_50px_rgba(194,65,12,0.5)] transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em] text-xs"
                    >
                      Finalizar Pedido
                    </button>
                  ) : !isPaymentReviewOpen ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="space-y-3">
                        <input placeholder="Nome Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-stone-100 focus:ring-4 focus:ring-orange-700/5 bg-white font-bold" />
                        <input placeholder="WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-stone-100 focus:ring-4 focus:ring-orange-700/5 bg-white font-bold" />
                        <textarea placeholder="Endereço Completo" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-stone-100 focus:ring-4 focus:ring-orange-700/5 bg-white font-bold h-24 resize-none" />
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-stone-100 focus:ring-4 focus:ring-orange-700/5 bg-white font-black uppercase text-xs tracking-widest">
                          {(settings.paymentMethods || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 bg-stone-200 text-stone-600 font-black py-5 rounded-[1.5rem] uppercase text-[10px] tracking-widest">Voltar</button>
                        <button 
                          onClick={() => {
                            if (!customerName || !customerPhone || !deliveryAddress) {
                              alert('Por favor, preencha todos os campos obrigatórios.');
                              return;
                            }
                            setIsPaymentReviewOpen(true);
                          }} 
                          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl uppercase text-[10px] tracking-widest transition-all"
                        >
                          Revisar Pagamento
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="bg-blue-50 rounded-[2rem] p-6 border-2 border-blue-200">
                        <h4 className="font-black text-blue-900 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                          <CreditCard size={18} /> Revisão do Pagamento
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-stone-600 font-bold">Método de Pagamento:</span>
                            <span className="text-stone-900 font-black">{paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-600 font-bold">Subtotal:</span>
                            <span className="text-stone-900 font-black">{cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-600 font-bold">Taxa de Entrega:</span>
                            <span className="text-stone-900 font-black">{settings.deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          <div className="pt-3 border-t border-blue-200 flex justify-between">
                            <span className="text-blue-900 font-black text-lg">Total a Pagar:</span>
                            <span className="text-blue-900 font-black text-xl">{(cartTotal + settings.deliveryFee).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-[2rem] p-6 border border-stone-100">
                        <h4 className="font-black text-stone-900 mb-3 uppercase tracking-widest text-xs">Dados de Entrega</h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-stone-700 font-bold"><span className="text-stone-500">Nome:</span> {customerName}</p>
                          <p className="text-stone-700 font-bold"><span className="text-stone-500">WhatsApp:</span> {customerPhone}</p>
                          <p className="text-stone-700 font-bold"><span className="text-stone-500">Endereço:</span> {deliveryAddress}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setIsPaymentReviewOpen(false)} className="flex-1 bg-stone-200 text-stone-600 font-black py-5 rounded-[1.5rem] uppercase text-[10px] tracking-widest">Voltar</button>
                        <button 
                          onClick={placeOrder} 
                          className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl uppercase text-[10px] tracking-widest transition-all"
                        >
                          Confirmar e Enviar Pedido
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Confirmation Modal */}
      <AnimatePresence>
        {orderConfirmation && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setOrderConfirmation(null)} 
              className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-12 text-center bg-gradient-to-br from-green-50 to-orange-50 border-b border-stone-100">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-600/30"
                >
                  <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
                </motion.div>
                <h3 className="text-4xl font-black text-stone-900 tracking-tighter mb-3">
                  Pedido Confirmado!
                </h3>
                <p className="text-stone-600 font-bold text-lg">
                  Pedido #{orderConfirmation.id}
                </p>
              </div>

              <div className="p-12 space-y-8">
                <div className="bg-stone-50 rounded-[2rem] p-8 border border-stone-100">
                  <h4 className="font-black text-stone-900 mb-6 uppercase tracking-widest text-xs">Resumo do Pedido</h4>
                  <div className="space-y-4">
                    {orderConfirmation.items.map((cartItem, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-stone-100 last:border-0">
                        <span className="font-bold text-stone-800">
                          {cartItem.quantity}x {cartItem.item.name}
                        </span>
                        <span className="font-black text-stone-900">
                          {(cartItem.item.price * cartItem.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-stone-200 space-y-3">
                    <div className="flex justify-between text-stone-600 font-bold text-sm">
                      <span>Subtotal</span>
                      <span>{(orderConfirmation.total - settings.deliveryFee).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 font-bold text-sm">
                      <span>Taxa de Entrega</span>
                      <span>{settings.deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-stone-300">
                      <span className="text-2xl font-black text-stone-900 uppercase">Total</span>
                      <span className="text-3xl font-black text-orange-700">
                        {orderConfirmation.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
                  <h4 className="font-black text-blue-900 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                    <MessageCircle size={16} /> Informações do Cliente
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-bold text-stone-800"><span className="text-stone-500">Nome:</span> {orderConfirmation.customerName}</p>
                    <p className="font-bold text-stone-800"><span className="text-stone-500">WhatsApp:</span> {orderConfirmation.customerPhone}</p>
                    <p className="font-bold text-stone-800"><span className="text-stone-500">Endereço:</span> {orderConfirmation.address}</p>
                    <p className="font-bold text-stone-800"><span className="text-stone-500">Pagamento:</span> {orderConfirmation.paymentMethod}</p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-[2rem] p-6 border border-green-100">
                  <p className="text-green-800 font-bold text-sm leading-relaxed">
                    ✓ Seu pedido foi enviado para o WhatsApp do restaurante. 
                    Em breve você receberá a confirmação e o tempo estimado de entrega.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setOrderConfirmation(null)}
                    className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-widest transition-all"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => {
                      setOrderConfirmation(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 bg-orange-700 hover:bg-orange-800 text-white font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-widest shadow-xl transition-all"
                  >
                    Ver Cardápio
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Item Modal */}
      <AnimatePresence>
        {isNewItemModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsNewItemModalOpen(false)} 
              className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-orange-700 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
                    <Plus size={32} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-stone-900 tracking-tighter">Novo Item</h3>
                    <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest mt-1">Adicionar ao Cardápio</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsNewItemModalOpen(false)} 
                  className="w-14 h-14 bg-white hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-2xl transition-all shadow-xl flex items-center justify-center active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-10 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Nome do Item</label>
                  <input 
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                    placeholder="Ex: Refrigerante, Pudim, etc."
                    className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 focus:border-orange-700/20 bg-stone-50/50 font-black text-lg text-stone-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Preço (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={newItemForm.price}
                      onChange={(e) => setNewItemForm({...newItemForm, price: e.target.value})}
                      placeholder="15.90"
                      className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-black text-lg text-stone-900"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Categoria</label>
                    <select 
                      value={newItemForm.category}
                      onChange={(e) => setNewItemForm({...newItemForm, category: e.target.value})}
                      className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-black text-lg text-stone-900"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Descrição</label>
                  <textarea 
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm({...newItemForm, description: e.target.value})}
                    placeholder="Descreva o item..."
                    rows={3}
                    className="w-full px-8 py-5 rounded-3xl border border-stone-100 focus:outline-none focus:ring-4 focus:ring-orange-700/5 bg-stone-50/50 font-bold text-stone-900 resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    onClick={() => setIsNewItemModalOpen(false)}
                    className="flex-1 bg-stone-200 text-stone-600 font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-widest transition-all hover:bg-stone-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (!newItemForm.name || !newItemForm.price || !newItemForm.category) {
                        alert('Por favor, preencha todos os campos obrigatórios!');
                        return;
                      }
                      const newItem: MenuItem = {
                        id: generateId(),
                        name: newItemForm.name,
                        price: parseFloat(newItemForm.price.replace(',', '.')) || 0,
                        description: newItemForm.description || 'Item especial da casa...',
                        category: newItemForm.category,
                        available: true
                      };
                      setItems([...items, newItem]);
                      setNewItemForm({ name: '', price: '', description: '', category: categories[0]?.id || '' });
                      setIsNewItemModalOpen(false);
                    }}
                    className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl uppercase text-xs tracking-widest transition-all"
                  >
                    Adicionar Item
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
