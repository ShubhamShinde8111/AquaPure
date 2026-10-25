/**
 * AquaPure — Checkout Screen
 * Route: /checkout
 *
 * Implements:
 * 1. Checkout Review Screen (Step 1):
 *    - Displays all selected products, images, unit prices, line totals, and quantities.
 *    - Interactive quantity stepper ([-] and [+]) with stock enforcement.
 *    - Remove individual products with instant state updates.
 *    - Real-time dynamic recalculation of subtotal, delivery fee, and grand total.
 * 2. Delivery & Payment Screen (Step 2):
 *    - Auto-location reverse-geocoding via LocationService.
 *    - Saved address selection and validation.
 *    - Payment method radio cards: Razorpay (Test Mode) & Cash on Delivery.
 *    - Compact item review banner with quick "Edit" jump back to Step 1.
 * 3. Cart Separation & Isolation:
 *    - Powered by `useCheckoutStore`.
 *    - If initiated via "Buy Now" (single product), cart items in `useCartStore` are kept isolated and NOT cleared.
 *    - If initiated via Cart, `useCartStore` is synced and cleared upon successful order.
 * 4. Payment Confirmation:
 *    - Proceed to payment only after user reviews and confirms final order.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCartStore } from '@/stores/cartStore';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl } from '@/components/ui';
import { Order, Address } from '@/types';
import { db } from '@/services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { NotificationsService } from '@/services/notificationsService';
import { EmailService } from '@/services/emailService';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { LocationService } from '@/services/locationService';
import { PaymentService } from '@/services/paymentService';
import { RazorpayModal } from '@/components/RazorpayModal';

// ── Helpers ──
const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const formatPrice = (amount: number) => priceFormatter.format(amount);

type FieldKey = 'fullName' | 'email' | 'phone' | 'addressLine1' | 'city' | 'pincode';
type FieldErrors = Partial<Record<FieldKey, string>>;
type PaymentMethod = 'razorpay' | 'cod';
type CheckoutStep = 'review' | 'payment';

const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
};

const PAYMENT_OPTIONS: {
  key: PaymentMethod;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'razorpay',
    title: 'Razorpay (Test Mode)',
    description: 'UPI, Debit/Credit Card, NetBanking & Wallets',
    icon: 'card-outline',
  },
  {
    key: 'cod',
    title: 'Cash on delivery',
    description: 'Pay cash or by QR to the technician on delivery',
    icon: 'cash-outline',
  },
];

// ── Small components ──
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text style={styles.fieldError} accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export default function CheckoutScreen() {
  const {
    items,
    source,
    initCheckout,
    updateQuantity,
    removeItem,
    getSubtotal,
    getShippingFee,
    getTotal,
    syncDealerPrices,
    clearCheckout,
  } = useCheckoutStore();

  const { items: cartItems, clearCart } = useCartStore();

  const {
    user,
    profile,
    isDealerApproved,
    refreshProfile,
    saveAddress,
    loading,
    setPendingAction,
  } = useAuthStore();

  // Current Checkout Step
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');

  // Fallback recovery if checkout items are empty but cart has items
  useEffect(() => {
    if (items.length === 0 && cartItems.length > 0 && !orderPlaced.current) {
      initCheckout(cartItems, 'cart');
    }
  }, [items.length, cartItems, initCheckout]);

  // Address state
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Auto-sync authenticated profile details for registered customers & dealers
  useEffect(() => {
    if (profile?.email || user?.email) {
      setEmail((prev) => (prev ? prev : profile?.email || user?.email || ''));
    }
    if (profile?.displayName) {
      setFullName((prev) => (prev ? prev : profile.displayName || ''));
    }
    if (profile?.phone) {
      setPhone((prev) => (prev ? prev : profile.phone || ''));
    }
  }, [profile, user]);

  // Location & Saved Addresses state
  const [locating, setLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [locationWarning, setLocationWarning] = useState('');
  const [locationError, setLocationError] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [activeRazorpayOrderId, setActiveRazorpayOrderId] = useState<string>('');
  const [activeRazorpayAmount, setActiveRazorpayAmount] = useState<number>(0);
  const pendingShippingAddress = useRef<Address | null>(null);

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  // Set right before the cart is cleared so the empty-cart view doesn't flash
  const orderPlaced = useRef(false);

  const handleRefresh = useCallback(async () => {
    setError('');
    if (user) {
      await refreshProfile();
    }
    syncDealerPrices(isDealerApproved);
  }, [user, refreshProfile, syncDealerPrices, isDealerApproved]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const subtotal = getSubtotal();
  const shipping = getShippingFee();
  const total = getTotal();
  const itemCount = items.reduce((sum, i) => sum + (i?.quantity || 0), 0);

  /** Update a field and clear its inline error */
  const updateField = useCallback(
    (key: FieldKey, setter: (v: string) => void) => (value: string) => {
      setter(value);
      setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    },
    []
  );

  const showError = useCallback((message: string) => {
    setError(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  /** Quantity Stepper handlers in Checkout Review */
  const handleDecrement = (productId: string, currentQty: number) => {
    if (currentQty <= 1) {
      Alert.alert(
        'Remove Product',
        'Do you want to remove this product from checkout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeItem(productId),
          },
        ]
      );
    } else {
      updateQuantity(productId, currentQty - 1);
    }
  };

  const handleIncrement = (productId: string, currentQty: number, maxLimit: number) => {
    if (currentQty >= maxLimit) {
      Alert.alert(
        'Stock Limit Reached',
        `Only ${maxLimit} units of this item are available per order.`
      );
      return;
    }
    updateQuantity(productId, currentQty + 1);
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Remove Product',
      `Are you sure you want to remove ${productName} from your order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem(productId),
        },
      ]
    );
  };

  /** Taps "Use My Current Location" button */
  const handleUseCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationError('');
    setLocationSuccess('');
    setLocationWarning('');

    const res = await LocationService.getCurrentDeliveryAddress();
    setLocating(false);

    if (!res.success || !res.address) {
      setLocationError(res.error || 'Unable to retrieve your current location.');
      return;
    }

    const { address } = res;
    setCurrentCoords({ latitude: address.latitude, longitude: address.longitude });
    setSelectedSavedAddressId(null);

    // Auto-fill available address fields
    if (address.addressLine1) {
      setAddressLine1(address.addressLine1);
      setFieldErrors((prev) => ({ ...prev, addressLine1: undefined }));
    }
    if (address.addressLine2) {
      setAddressLine2(address.addressLine2);
    }
    if (address.city) {
      setCity(address.city);
      setFieldErrors((prev) => ({ ...prev, city: undefined }));
    }
    if (address.state) {
      setState(address.state);
    }
    if (address.pincode) {
      setPincode(address.pincode);
      setFieldErrors((prev) => ({ ...prev, pincode: undefined }));
    }

    setLocationSuccess('Current location detected! Address details have been populated.');
    if (address.isHouseNumberMissing) {
      setLocationWarning('Please add your house/flat/building number above to complete the address.');
    }
  };

  /** Pre-fill address fields from a previously saved address */
  const handleSelectSavedAddress = (saved: Address) => {
    setSelectedSavedAddressId(saved.id);
    if (saved.fullName) setFullName(saved.fullName);
    if (saved.email) setEmail(saved.email);
    if (saved.phone) setPhone(saved.phone);
    setAddressLine1(saved.addressLine1 || '');
    setAddressLine2(saved.addressLine2 || '');
    setCity(saved.city || '');
    setState(saved.state || '');
    setPincode(saved.pincode || '');
    if (saved.latitude && saved.longitude) {
      setCurrentCoords({ latitude: saved.latitude, longitude: saved.longitude });
    }
    if (saved.label && ['Home', 'Office', 'Other'].includes(saved.label)) {
      setAddressLabel(saved.label as 'Home' | 'Office' | 'Other');
    }
    setLocationError('');
    setLocationWarning('');
    setLocationSuccess(`Loaded saved address: ${saved.label || 'Saved'}`);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = 'Enter the recipient’s name.';
    if (!email.trim()) errors.email = 'Enter an email address for order confirmation.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!phone.trim()) errors.phone = 'Enter a contact number.';
    else if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
    if (!addressLine1.trim()) errors.addressLine1 = 'Enter the house or street address.';
    if (!city.trim()) errors.city = 'Enter the city.';
    if (!pincode.trim()) errors.pincode = 'Enter the pincode.';
    else if (!/^\d{6}$/.test(pincode.trim())) errors.pincode = 'Pincode must be 6 digits.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      showError('Please fix the highlighted delivery details.');
      return false;
    }
    return true;
  };

  /**
   * Finalize confirmed order in database and navigate to success
   */
  const finalizeOrder = async (orderPayload: Omit<Order, 'id'>, customTotal?: number) => {
    if (!user) {
      showError('You must be signed in to place an order.');
      setPlacingOrder(false);
      return;
    }
    let generatedId = orderPayload.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

    const registeredEmail = (user?.email || profile?.email || email || '').trim();
    const recipientEmail = registeredEmail || 'customer@example.com';

    try {
      if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        const sanitizedOrder = JSON.parse(JSON.stringify(orderPayload));
        if (!sanitizedOrder.customerEmail && recipientEmail) {
          sanitizedOrder.customerEmail = recipientEmail;
        }
        if (sanitizedOrder.shippingAddress && !sanitizedOrder.shippingAddress.email && recipientEmail) {
          sanitizedOrder.shippingAddress.email = recipientEmail;
        }
        const docRef = await addDoc(collection(db, 'orders'), sanitizedOrder);
        generatedId = docRef.id;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      console.error('Firestore order write error:', err);
      showError(`Unable to save order record: ${msg}. Please check your connection.`);
      setPlacingOrder(false);
      return;
    }

    // Extract ordered items prior to clearing checkout
    const orderItems =
      orderPayload.items && orderPayload.items.length > 0
        ? orderPayload.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }))
        : items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.unitPrice,
          }));

    const itemsSummary = orderItems.map((i) => `${i.quantity}x ${i.name}`).join(', ');

    orderPlaced.current = true;

    // Isolate cart clearing: Only clear cart store if checkout was started from cart
    if (source === 'cart') {
      clearCart();
    }
    clearCheckout();

    if (user && saveAddressToProfile && pendingShippingAddress.current) {
      saveAddress(pendingShippingAddress.current).catch((saveErr) => {
        console.warn('Address profile save notice:', saveErr);
      });
    }

    const orderFinalTotal = customTotal !== undefined ? customTotal : orderPayload.total;
    const isWholesale = Boolean(isDealerApproved || orderPayload.orderType === 'dealer');
    const recipientName =
      fullName.trim() ||
      profile?.displayName ||
      (isWholesale ? 'Wholesale Partner' : 'Valued Customer');

    setPlacingOrder(false);
    NotificationsService.notifyOrderPlaced(
      generatedId,
      orderPayload.orderNumber || generatedId,
      orderFinalTotal.toString()
    );
    EmailService.sendOrderConfirmation({
      toEmail: recipientEmail,
      toName: recipientName,
      orderId: generatedId,
      totalAmount: orderFinalTotal.toString(),
      subtotalAmount: (orderPayload.subtotal ?? subtotal).toString(),
      shippingFee: (shipping ?? 0).toString(),
      paymentMethod:
        orderPayload.paymentProvider === 'razorpay'
          ? 'Razorpay (Test Mode)'
          : 'Cash on Delivery',
      paymentStatus:
        orderPayload.paymentStatus ||
        (orderPayload.paymentProvider === 'razorpay' ? 'test_success' : 'pending'),
      paymentReference: orderPayload.paymentReference || '',
      deliveryAddress: `${addressLine1}, ${city} - ${pincode}`,
      phone: phone.trim(),
      orderType: isWholesale ? 'dealer' : 'customer',
      isDealer: isWholesale,
      orderDate: orderPayload.createdAt || new Date().toISOString(),
      items: orderItems,
      itemsSummary,
    });

    router.replace({
      pathname: '/checkout/success',
      params: {
        orderId: generatedId,
        total: orderFinalTotal.toString(),
        paymentId: orderPayload.paymentReference || '',
      },
    });
  };

  /**
   * Verified Razorpay payment callback
   */
  const handleRazorpaySuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayModalVisible(false);
    setPlacingOrder(true);
    setError('');

    try {
      const recipientEmail = (email && email.trim()) || user?.email || profile?.email || '';
      const shippingAddress = pendingShippingAddress.current || {
        id: selectedSavedAddressId || `addr-${Date.now()}`,
        label: addressLabel || 'Delivery Address',
        fullName: fullName.trim(),
        email: recipientEmail,
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim() || 'State',
        pincode: pincode.trim(),
      };

      // 1. Mandatory server-side cryptographic signature verification
      const verifyRes = await PaymentService.verifyPayment({
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
        clientOrderContext: {
          customerId: user ? user.uid : '',
          customerEmail: recipientEmail,
          orderType: isDealerApproved ? 'dealer' : 'customer',
          subtotal,
          total,
          shippingAddress,
        },
      });

      if (!verifyRes.verified) {
        setPlacingOrder(false);
        showError(
          verifyRes.error ||
            'Payment verification failed on the server. Your card/account was not debited.'
        );
        return;
      }

      // 2. Order confirmed securely
      const confirmedOrderNumber =
        verifyRes.order?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
      const confirmedOrder: Omit<Order, 'id'> = {
        orderNumber: confirmedOrderNumber,
        customerId: user ? user.uid : '',
        customerEmail: recipientEmail,
        ...(isDealerApproved && user ? { dealerId: user.uid } : {}),
        orderType: isDealerApproved ? 'dealer' : 'customer',
        items: items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          imageUrl: i.product.imageUrl,
          price: i.unitPrice,
          quantity: i.quantity,
        })),
        subtotal,
        total,
        shippingAddress,
        paymentProvider: 'razorpay',
        paymentStatus: 'test_success',
        paymentReference: paymentData.razorpay_payment_id,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
        orderStatus: 'placed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await finalizeOrder(confirmedOrder, total);
    } catch (err) {
      console.error('Post-payment confirmation error:', err);
      setPlacingOrder(false);
      showError('Network error while confirming your payment with AquaPure servers. Please retry.');
    }
  };

  /**
   * Handle Razorpay payment failure
   */
  const handleRazorpayFailure = async (errorReason: string) => {
    setRazorpayModalVisible(false);
    setPlacingOrder(false);
    if (activeRazorpayOrderId) {
      await PaymentService.recordFailure(activeRazorpayOrderId, errorReason);
    }
    showError(`Payment failed: ${errorReason}. Your selected items are preserved. Please retry.`);
  };

  /**
   * Handle Razorpay payment dismissal / cancellation
   */
  const handleRazorpayDismiss = async () => {
    setRazorpayModalVisible(false);
    setPlacingOrder(false);
    if (activeRazorpayOrderId) {
      await PaymentService.recordCancellation(activeRazorpayOrderId);
    }
    showError('Payment attempt was cancelled. Your delivery details and items remain intact.');
  };

  /**
   * Initiate order placement / payment
   */
  const handlePlaceOrder = async () => {
    if (placingOrder) return; // double-submit guard
    setError('');

    if (!user) {
      showError('Please sign in to complete your order.');
      setPendingAction({
        type: 'PLACE_ORDER',
        returnUrl: '/checkout',
      });
      router.push('/auth/login');
      return;
    }

    if (items.length === 0) {
      showError('Your checkout is empty.');
      return;
    }
    if (!validate()) return;

    setPlacingOrder(true);
    const recipientEmail = (email && email.trim()) || user?.email || profile?.email || '';
    const shippingAddress: Address = {
      id: selectedSavedAddressId || `addr-${Date.now()}`,
      label: addressLabel || 'Delivery Address',
      fullName: fullName.trim(),
      email: recipientEmail,
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      ...(addressLine2.trim() ? { addressLine2: addressLine2.trim() } : {}),
      city: city.trim(),
      state: state.trim() || 'State',
      pincode: pincode.trim(),
      ...(currentCoords ? { latitude: currentCoords.latitude, longitude: currentCoords.longitude } : {}),
    };

    pendingShippingAddress.current = shippingAddress;

    // Flow A: Razorpay Gateway Checkout
    if (paymentMethod === 'razorpay') {
      try {
        const orderRes = await PaymentService.createRazorpayOrder({
          items,
          shippingAddress,
          isDealer: isDealerApproved,
          customerId: user?.uid,
        });

        setActiveRazorpayOrderId(orderRes.razorpayOrderId);
        setActiveRazorpayAmount(orderRes.pricing.total);

        // On Web, use standard Razorpay checkout.js script if available
        if (Platform.OS === 'web') {
          try {
            await PaymentService.openWebCheckout({
              key: orderRes.keyId,
              amount: orderRes.amount,
              currency: orderRes.currency,
              name: 'AquaPure',
              description: 'Pure Water Guaranteed — Test Checkout',
              order_id: orderRes.razorpayOrderId,
              prefill: {
                name: fullName.trim(),
                email: recipientEmail || 'customer@example.com',
                contact: phone.trim(),
              },
              notes: {
                address: `${addressLine1}, ${city}`,
              },
              onSuccess: handleRazorpaySuccess,
              onDismiss: handleRazorpayDismiss,
              onError: (err) => handleRazorpayFailure(err instanceof Error ? err.message : 'Gateway error'),
            });
            setPlacingOrder(false);
            return;
          } catch (webErr) {
            console.warn('Web checkout fallback to in-app modal:', webErr);
          }
        }

        // On native/mobile (or web fallback): Open RazorpayModal
        setPlacingOrder(false);
        setRazorpayModalVisible(true);
      } catch (orderErr) {
        console.error('Create Razorpay order error:', orderErr);
        setPlacingOrder(false);
        showError(
          orderErr instanceof Error
            ? orderErr.message
            : 'Unable to initialize Razorpay test payment gateway. Please ensure backend is running.'
        );
      }
      return;
    }

    // Flow B: Cash on delivery
    const customerOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const codOrder: Omit<Order, 'id'> = {
      orderNumber: customerOrderNumber,
      customerId: user ? user.uid : '',
      customerEmail: recipientEmail,
      ...(isDealerApproved && user ? { dealerId: user.uid } : {}),
      orderType: isDealerApproved ? 'dealer' : 'customer',
      items: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        imageUrl: i.product.imageUrl,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
      subtotal,
      total,
      shippingAddress,
      paymentProvider: 'cash_on_delivery',
      paymentStatus: 'pending',
      paymentReference: `COD-TXN-${Date.now()}`,
      orderStatus: 'placed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await finalizeOrder(codOrder, total);
  };

  const navBar = (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (currentStep === 'payment') {
            setCurrentStep('review');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          } else {
            router.back();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <View style={styles.navTitleWrap}>
        <Text style={styles.navTitle}>
          {currentStep === 'review' ? 'Checkout: Review' : 'Checkout: Payment'}
        </Text>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          <Text style={styles.secureText}>
            {currentStep === 'review' ? 'Step 1 of 2: Review Order' : 'Step 2 of 2: Final Confirmation'}
          </Text>
        </View>
      </View>
      <View style={styles.navSpacer} />
    </View>
  );

  // ── Authentication Required ──
  if (!user && !loading && !orderPlaced.current) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {navBar}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to place order</Text>
          <Text style={styles.emptyText}>
            You must be logged in to review your order details, select your delivery address, and proceed with payment.
          </Text>
          <Button
            title="Sign In / Register"
            variant="primary"
            size="lg"
            onPress={() => {
              setPendingAction({
                type: 'PLACE_ORDER',
                returnUrl: '/checkout',
              });
              router.push('/auth/login');
            }}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
          <Button
            title="Return to Cart"
            variant="secondary"
            size="md"
            onPress={() => router.replace('/(tabs)/cart')}
            style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty Checkout State ──
  if (items.length === 0 && !orderPlaced.current) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {navBar}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your checkout is empty</Text>
          <Text style={styles.emptyText}>
            All products have been removed from this order session. Add a purifier, filter, or spare part to check out.
          </Text>
          <Button
            title="Browse products"
            variant="accent"
            size="lg"
            onPress={() => router.replace('/(tabs)/categories')}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
          <Button
            title="View Shopping Cart"
            variant="secondary"
            size="md"
            onPress={() => router.replace('/(tabs)/cart')}
            style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {navBar}

      {/* ── Checkout Stepper Progress Bar ── */}
      <View style={styles.stepperContainer}>
        <TouchableOpacity
          style={[styles.stepItem, currentStep === 'review' && styles.stepItemActive]}
          onPress={() => {
            setCurrentStep('review');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.stepNumber,
              currentStep === 'review' ? styles.stepNumberActive : styles.stepNumberDone,
            ]}
          >
            {currentStep === 'payment' ? (
              <Ionicons name="checkmark" size={14} color={colors.white} />
            ) : (
              <Text style={styles.stepNumberText}>1</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === 'review' && styles.stepLabelActive,
            ]}
          >
            1. Review Items
          </Text>
        </TouchableOpacity>

        <View style={styles.stepDivider} />

        <TouchableOpacity
          style={[styles.stepItem, currentStep === 'payment' && styles.stepItemActive]}
          onPress={() => {
            if (items.length > 0) {
              setCurrentStep('payment');
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.stepNumber,
              currentStep === 'payment' && styles.stepNumberActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumberText,
                currentStep !== 'payment' && { color: colors.textSecondary },
              ]}
            >
              2
            </Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === 'payment' && styles.stepLabelActive,
            ]}
          >
            2. Delivery & Payment
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to refresh checkout"
            />
          }
        >
          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 1: CHECKOUT REVIEW SCREEN                      */}
          {/* ═══════════════════════════════════════════════════ */}
          {currentStep === 'review' ? (
            <View style={styles.stepReviewWrap}>
              {/* Notice banner if single Buy Now purchase */}
              {source === 'buy_now' && (
                <View style={styles.buyNowNoticeBanner}>
                  <Ionicons name="flash" size={16} color={colors.primary} />
                  <Text style={styles.buyNowNoticeText}>
                    Purchasing this item alone. Any other items in your cart remain saved.
                  </Text>
                </View>
              )}

              {/* Review Header */}
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.reviewHeading}>
                    Review Selected Products ({itemCount})
                  </Text>
                  <Text style={styles.reviewSubheading}>
                    Check quantities and pricing before proceeding to payment.
                  </Text>
                </View>
                {isDealerApproved && (
                  <View style={styles.dealerChip}>
                    <Ionicons name="pricetag" size={11} color={colors.primary} />
                    <Text style={styles.dealerChipText}>Dealer Wholesale</Text>
                  </View>
                )}
              </View>

              {/* Interactive Product List with Stepper and Remove */}
              {items.map((item) => {
                const maxLimit =
                  item.maxQuantity ||
                  (item.product.stockStatus === 'limited' ? 5 : 10);
                const isMax = item.quantity >= maxLimit;

                return (
                  <View key={item.product.id} style={styles.reviewProductCard}>
                    <View style={styles.reviewProductTopRow}>
                      <View style={styles.reviewProductImageWrap}>
                        {item.product.imageUrl ? (
                          <Image
                            source={{ uri: item.product.imageUrl }}
                            style={styles.reviewProductImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.reviewProductImagePlaceholder}>
                            <Ionicons name="water-outline" size={24} color={colors.textSecondary} />
                          </View>
                        )}
                      </View>

                      <View style={styles.reviewProductDetails}>
                        <Text style={styles.reviewCategoryLabel}>
                          {(
                            item.product.category ||
                            item.product.categoryId?.replace(/-/g, ' ') ||
                            'PURIFIER'
                          ).toUpperCase()}
                        </Text>
                        <Text style={styles.reviewProductName} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        <View style={styles.reviewPriceRow}>
                          <Text style={styles.reviewUnitPrice}>
                            {formatPrice(item.unitPrice)} each
                          </Text>
                          {isDealerApproved && item.product.dealerPrice && (
                            <View style={styles.reviewDealerPill}>
                              <Text style={styles.reviewDealerPillText}>Wholesale</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity
                        style={styles.reviewRemoveBtn}
                        onPress={() => handleRemoveProduct(item.product.id, item.product.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Remove ${item.product.name} from checkout`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Row: Quantity Stepper & Line Total */}
                    <View style={styles.reviewProductBottomRow}>
                      <View style={styles.reviewStepperWrap}>
                        <TouchableOpacity
                          style={styles.reviewStepBtn}
                          onPress={() => handleDecrement(item.product.id, item.quantity)}
                          activeOpacity={0.7}
                          accessibilityLabel="Decrease quantity"
                        >
                          <Ionicons
                            name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                            size={16}
                            color={item.quantity === 1 ? colors.error : colors.primary}
                          />
                        </TouchableOpacity>

                        <View style={styles.reviewQtyDisplay}>
                          <Text style={styles.reviewQtyValue}>{item.quantity}</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.reviewStepBtn, isMax && styles.reviewStepBtnDisabled]}
                          onPress={() => handleIncrement(item.product.id, item.quantity, maxLimit)}
                          disabled={isMax}
                          activeOpacity={0.7}
                          accessibilityLabel="Increase quantity"
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={isMax ? colors.border : colors.primary}
                          />
                        </TouchableOpacity>

                        {isMax && (
                          <Text style={styles.maxLimitHint}>Limit {maxLimit}</Text>
                        )}
                      </View>

                      <View style={styles.reviewLineTotalWrap}>
                        <Text style={styles.reviewLineTotalLabel}>Item Total</Text>
                        <Text style={styles.reviewLineTotalValue}>
                          {formatPrice(item.unitPrice * item.quantity)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Price Breakdown Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Price Breakdown</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      shipping === 0 && { color: colors.success, fontWeight: '700' },
                    ]}
                  >
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </Text>
                </View>

                {shipping > 0 ? (
                  <View style={styles.deliveryPromoNotice}>
                    <Ionicons name="sparkles" size={14} color={colors.warning} />
                    <Text style={styles.deliveryPromoText}>
                      Add {formatPrice(999 - subtotal)} more to unlock FREE Delivery!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.deliveryFreeNotice}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.deliveryFreeText}>
                      Free delivery applied to your order!
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalValue}>{formatPrice(total)}</Text>
                </View>
              </View>
            </View>
          ) : (
            /* ═══════════════════════════════════════════════════ */
            /* STEP 2: DELIVERY & PAYMENT SCREEN                   */
            /* ═══════════════════════════════════════════════════ */
            <View style={styles.stepPaymentWrap}>
              {/* Order Items Review Snippet */}
              <View style={styles.compactReviewBanner}>
                <View style={styles.flex}>
                  <View style={styles.compactReviewTitleRow}>
                    <Text style={styles.compactReviewTitle}>
                      {itemCount} {itemCount === 1 ? 'Product' : 'Products'} Selected
                    </Text>
                    <Text style={styles.compactReviewTotal}>{formatPrice(total)}</Text>
                  </View>
                  <Text style={styles.compactReviewSub} numberOfLines={1}>
                    {items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editItemsBtn}
                  onPress={() => {
                    setCurrentStep('review');
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={styles.editItemsBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Section 1: Delivery address */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Delivery address</Text>
                </View>

                {/* 📍 Use My Current Location Button */}
                <TouchableOpacity
                  style={[styles.locationBtn, locating && styles.locationBtnActive]}
                  onPress={handleUseCurrentLocation}
                  disabled={locating}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Use My Current Location"
                  accessibilityHint="Retrieves your current GPS coordinates and auto-fills delivery address fields"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.locationBtnIconWrap}>
                      <Ionicons name="navigate" size={16} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.locationBtnTextWrap}>
                    <Text style={styles.locationBtnTitle}>
                      {locating ? 'Detecting your location…' : '📍 Use My Current Location'}
                    </Text>
                    <Text style={styles.locationBtnSubtitle}>
                      {locating
                        ? 'Accessing GPS & reverse geocoding address'
                        : 'Auto-fill street, locality, city, and pincode'}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={locating ? colors.border : colors.primary}
                  />
                </TouchableOpacity>

                {/* Location Success Banner */}
                {locationSuccess ? (
                  <View style={styles.locSuccessBanner} accessibilityLiveRegion="polite">
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.locSuccessText}>{locationSuccess}</Text>
                    <TouchableOpacity
                      onPress={() => setLocationSuccess('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Location Warning / House Number Missing Banner */}
                {locationWarning ? (
                  <View style={styles.locWarningBanner} accessibilityLiveRegion="polite">
                    <Ionicons name="information-circle" size={18} color={colors.warning} />
                    <Text style={styles.locWarningText}>{locationWarning}</Text>
                  </View>
                ) : null}

                {/* Location Error / Denied Banner */}
                {locationError ? (
                  <View style={styles.locErrorBanner} accessibilityRole="alert">
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <View style={styles.flex}>
                      <Text style={styles.locErrorText}>{locationError}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setLocationError('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Saved Addresses quick selection if available */}
                {profile?.addresses && profile.addresses.length > 0 ? (
                  <View style={styles.savedAddressesWrap}>
                    <Text style={styles.savedAddressesTitle}>Or select a saved address:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedAddressesList}
                    >
                      {profile.addresses.map((saved) => {
                        const isSelected = selectedSavedAddressId === saved.id;
                        return (
                          <TouchableOpacity
                            key={saved.id}
                            style={[
                              styles.savedAddressChip,
                              isSelected && styles.savedAddressChipSelected,
                            ]}
                            onPress={() => handleSelectSavedAddress(saved)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={
                                saved.label?.toLowerCase() === 'office'
                                  ? 'business-outline'
                                  : 'home-outline'
                              }
                              size={14}
                              color={isSelected ? colors.primary : colors.textSecondary}
                            />
                            <View style={{ maxWidth: 160 }}>
                              <Text
                                style={[
                                  styles.savedAddressChipLabel,
                                  isSelected && styles.savedAddressChipLabelSelected,
                                ]}
                              >
                                {saved.label || 'Saved'}
                              </Text>
                              <Text style={styles.savedAddressChipSub} numberOfLines={1}>
                                {saved.addressLine1}, {saved.city}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <Input
                  label="Full name"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChangeText={updateField('fullName', setFullName)}
                />
                <FieldError message={fieldErrors.fullName} />

                <Input
                  label="Email address"
                  placeholder="e.g. ramesh@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={updateField('email', setEmail)}
                />
                <FieldError message={fieldErrors.email} />

                <Input
                  label="Mobile number"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={updateField('phone', setPhone)}
                />
                <FieldError message={fieldErrors.phone} />

                <Input
                  label="House, flat or street"
                  placeholder="Flat 402, Royal Palms, Link Road"
                  value={addressLine1}
                  onChangeText={(v) => {
                    updateField('addressLine1', setAddressLine1)(v);
                    if (locationWarning) setLocationWarning('');
                  }}
                />
                <FieldError message={fieldErrors.addressLine1} />

                <Input
                  label="Locality or landmark (optional)"
                  placeholder="Near Metro Station"
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                />

                <View style={styles.rowInputs}>
                  <View style={styles.flex}>
                    <Input
                      label="City"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChangeText={updateField('city', setCity)}
                    />
                    <FieldError message={fieldErrors.city} />
                  </View>
                  <View style={styles.flex}>
                    <Input
                      label="State"
                      placeholder="Maharashtra"
                      value={state}
                      onChangeText={setState}
                    />
                  </View>
                </View>

                <Input
                  label="Pincode"
                  placeholder="400001"
                  keyboardType="number-pad"
                  value={pincode}
                  onChangeText={updateField('pincode', (v) =>
                    setPincode(v.replace(/\D/g, '').slice(0, 6))
                  )}
                />
                <FieldError message={fieldErrors.pincode} />

                {/* Save Address Option */}
                {user && (
                  <View style={styles.saveAddressContainer}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setSaveAddressToProfile((prev) => !prev)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: saveAddressToProfile }}
                    >
                      <Ionicons
                        name={saveAddressToProfile ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={saveAddressToProfile ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.checkboxLabel}>
                        Save this address for future orders
                      </Text>
                    </TouchableOpacity>

                    {saveAddressToProfile && (
                      <View style={styles.labelPickerRow}>
                        <Text style={styles.labelPickerTitle}>Tag as:</Text>
                        {(['Home', 'Office', 'Other'] as const).map((tag) => (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.tagBadge,
                              addressLabel === tag && styles.tagBadgeActive,
                            ]}
                            onPress={() => setAddressLabel(tag)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.tagBadgeText,
                                addressLabel === tag && styles.tagBadgeTextActive,
                              ]}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Section 2: Payment */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Payment method</Text>
                </View>

                {PAYMENT_OPTIONS.map((opt) => {
                  const selected = paymentMethod === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.paymentOption,
                        selected && styles.paymentOptionSelected,
                      ]}
                      onPress={() => setPaymentMethod(opt.key)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${opt.title}. ${opt.description}`}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.paymentTitle}>{opt.title}</Text>
                        <Text style={styles.paymentDesc}>{opt.description}</Text>
                      </View>
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 3: Final Order Summary */}
              <View style={styles.card}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.cardTitle}>
                    Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </Text>
                  {isDealerApproved && (
                    <View style={styles.dealerChip}>
                      <Ionicons name="pricetag" size={11} color={colors.primary} />
                      <Text style={styles.dealerChipText}>Dealer pricing</Text>
                    </View>
                  )}
                </View>

                {items.map((i) => (
                  <View key={i.product.id} style={styles.itemRow}>
                    <View style={styles.itemImageWrap}>
                      {i.product.imageUrl ? (
                        <Image
                          source={{ uri: i.product.imageUrl }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : null}
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {i.product.name}
                      </Text>
                      <Text style={styles.itemQty}>
                        {i.quantity} × {formatPrice(i.unitPrice)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatPrice(i.unitPrice * i.quantity)}
                    </Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      shipping === 0 && { color: colors.success, fontWeight: '700' },
                    ]}
                  >
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total payable</Text>
                  <Text style={styles.totalValue}>{formatPrice(total)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Bottom Bar ── */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomTotal}>{formatPrice(total)}</Text>
        </View>

        {currentStep === 'review' ? (
          <Button
            title="Proceed to Delivery & Payment →"
            variant="accent"
            size="lg"
            onPress={() => {
              setCurrentStep('payment');
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            style={{ flex: 1, marginLeft: spacing.lg }}
          />
        ) : (
          <Button
            title={paymentMethod === 'razorpay' ? 'Pay & place order' : 'Confirm order'}
            variant="accent"
            size="lg"
            loading={placingOrder}
            onPress={handlePlaceOrder}
            style={{ flex: 1, marginLeft: spacing.lg }}
          />
        )}
      </View>

      {/* Razorpay Test Mode Checkout Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderId={activeRazorpayOrderId}
        amount={activeRazorpayAmount || total}
        customerName={fullName.trim()}
        customerEmail={user?.email || 'customer@example.com'}
        customerPhone={phone.trim()}
        onSuccess={handleRazorpaySuccess}
        onFailure={handleRazorpayFailure}
        onDismiss={handleRazorpayDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // ── Nav ──
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSpacer: {
    width: 44,
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    ...typography.heading2,
    color: colors.text,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  secureText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },

  // ── Stepper ──
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  stepItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberActive: {
    backgroundColor: colors.primary,
  },
  stepNumberDone: {
    backgroundColor: colors.success,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  stepLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // ── Step 1: Review Styles ──
  stepReviewWrap: {
    gap: spacing.md,
  },
  buyNowNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyNowNoticeText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    fontWeight: '600',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewHeading: {
    ...typography.heading2,
    color: colors.text,
    fontSize: 18,
  },
  reviewSubheading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewProductCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewProductTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  reviewProductImageWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewProductImage: {
    width: '100%',
    height: '100%',
  },
  reviewProductImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewProductDetails: {
    flex: 1,
  },
  reviewCategoryLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  reviewProductName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  reviewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  reviewUnitPrice: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  reviewDealerPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  reviewDealerPillText: {
    ...typography.labelSmall,
    color: colors.coral,
    fontSize: 10,
    fontWeight: '700',
  },
  reviewRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  reviewProductBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  reviewStepBtn: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  reviewStepBtnDisabled: {
    opacity: 0.4,
  },
  reviewQtyDisplay: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  reviewQtyValue: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  maxLimitHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontSize: 11,
  },
  reviewLineTotalWrap: {
    alignItems: 'flex-end',
  },
  reviewLineTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  reviewLineTotalValue: {
    ...typography.heading3,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  deliveryPromoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
    borderRadius: radius.sm,
    gap: 6,
    marginTop: spacing.xs,
  },
  deliveryPromoText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
    fontSize: 12,
  },
  deliveryFreeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.xs,
    borderRadius: radius.sm,
    gap: 6,
    marginTop: spacing.xs,
  },
  deliveryFreeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 12,
  },

  // ── Step 2: Payment Styles ──
  stepPaymentWrap: {
    gap: spacing.md,
  },
  compactReviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  compactReviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  compactReviewTitle: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 15,
  },
  compactReviewTotal: {
    ...typography.heading3,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  compactReviewSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  editItemsBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  // ── Common Cards ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.heading3,
    color: colors.text,
  },

  // ── Location Button ──
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  locationBtnActive: {
    opacity: 0.7,
  },
  locationBtnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBtnTextWrap: {
    flex: 1,
  },
  locationBtnTitle: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  locationBtnSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  locSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  locSuccessText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
    fontWeight: '600',
  },
  locWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  locWarningText: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
    fontWeight: '600',
  },
  locErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  locErrorText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  // ── Saved addresses ──
  savedAddressesWrap: {
    marginBottom: spacing.xs,
  },
  savedAddressesTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  savedAddressesList: {
    gap: spacing.xs,
  },
  savedAddressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  savedAddressChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  savedAddressChipLabel: {
    ...typography.labelSmall,
    color: colors.text,
  },
  savedAddressChipLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  savedAddressChipSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },

  // ── Form Inputs ──
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.xs + 2,
    marginBottom: spacing.xs,
  },

  // ── Save Address Checkbox ──
  saveAddressContainer: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.text,
  },
  labelPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 28,
  },
  labelPickerTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tagBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  tagBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tagBadgeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Payment ──
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  paymentTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  paymentDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ── Summary Items ──
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  dealerChipText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemImageWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  itemQty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemTotal: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    ...typography.heading3,
    color: colors.text,
  },
  totalValue: {
    ...typography.heading2,
    color: colors.primary,
  },

  // ── Errors & Empty ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFEBEE',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Bottom Bar ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bottomTotal: {
    ...typography.heading2,
    color: colors.primary,
  },
});