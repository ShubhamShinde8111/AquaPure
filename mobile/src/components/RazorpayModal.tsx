/**
 * AquaPure — Official-Style Razorpay Test Mode Checkout Modal
 *
 * Implements the Razorpay Test Gateway UI for universal mobile and web experiences:
 * - Test Mode watermark and clear non-production indicators
 * - Test UPI options (success@razorpay vs failure@razorpay)
 * - Test Card credentials with simulated OTP confirmation
 * - NetBanking & Wallets
 * - Handles payment completion, cancellation, and simulated gateway failure
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { PaymentService } from '@/services/paymentService';

interface RazorpayModalProps {
  visible: boolean;
  orderId: string;
  amount: number; // in INR
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure: (errorReason: string) => void;
  onDismiss: () => void;
}

type TabType = 'upi' | 'card' | 'netbanking';

export function RazorpayModal({
  visible,
  orderId,
  amount,
  customerName,
  customerPhone,
  onSuccess,
  onFailure,
  onDismiss,
}: RazorpayModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upi');
  const [upiType, setUpiType] = useState<'success' | 'failure'>('success');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  const handleSimulatePayment = async (shouldSucceed: boolean) => {
    if (processing) return;
    setProcessing(true);
    setProcessingStep('Connecting to Razorpay Test Gateway…');

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (!shouldSucceed || (activeTab === 'upi' && upiType === 'failure')) {
        setProcessingStep('Declined by issuer (simulated failure)…');
        await new Promise((resolve) => setTimeout(resolve, 600));
        setProcessing(false);
        onFailure('Payment declined by test bank simulator (failure@razorpay).');
        return;
      }

      setProcessingStep('Generating secure cryptographic signature…');
      // Ask backend to sign this test transaction
      const credentials = await PaymentService.simulateTestSuccess(orderId);

      setProcessingStep('Payment authorized by test gateway!');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProcessing(false);

      onSuccess({
        razorpay_payment_id: credentials.razorpayPaymentId,
        razorpay_order_id: credentials.razorpayOrderId,
        razorpay_signature: credentials.razorpaySignature,
      });
    } catch (err) {
      setProcessing(false);
      onFailure(err instanceof Error ? err.message : 'Error simulating test payment.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Top Bar: Brand, Test Badge, and Close Button */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="water" size={18} color={colors.white} />
              </View>
              <View>
                <Text style={styles.brandTitle}>AquaPure</Text>
                <Text style={styles.gatewaySubtitle}>Razorpay Checkout</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.testBadge}>
                <Text style={styles.testBadgeText}>TEST MODE</Text>
              </View>
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close payment window"
                disabled={processing}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Banner */}
          <View style={styles.amountBar}>
            <View>
              <Text style={styles.amountLabel}>Payable Amount</Text>
              <Text style={styles.amountValue}>{formattedAmount}</Text>
            </View>
            <View style={styles.orderIdWrap}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderIdValue} numberOfLines={1}>{orderId}</Text>
            </View>
          </View>

          {/* Loading overlay if processing */}
          {processing ? (
            <View style={styles.processingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingTitle}>Authorizing Payment</Text>
              <Text style={styles.processingStep}>{processingStep}</Text>
              <Text style={styles.processingNotice}>
                Test transaction in progress. No real money will be charged.
              </Text>
            </View>
          ) : (
            <>
              {/* Payment Method Selector Tabs */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'upi' && styles.tabActive]}
                  onPress={() => setActiveTab('upi')}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={activeTab === 'upi' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tabText, activeTab === 'upi' && styles.tabTextActive]}>
                    UPI / QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, activeTab === 'card' && styles.tabActive]}
                  onPress={() => setActiveTab('card')}
                >
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={activeTab === 'card' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tabText, activeTab === 'card' && styles.tabTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, activeTab === 'netbanking' && styles.tabActive]}
                  onPress={() => setActiveTab('netbanking')}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={activeTab === 'netbanking' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tabText, activeTab === 'netbanking' && styles.tabTextActive]}>
                    NetBanking
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Contents */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {activeTab === 'upi' && (
                  <View style={styles.methodContent}>
                    <Text style={styles.sectionTitle}>Simulate UPI Payment</Text>
                    <Text style={styles.sectionDesc}>
                      Choose a test outcome to verify successful checkout or graceful failure handling:
                    </Text>

                    <TouchableOpacity
                      style={[styles.radioCard, upiType === 'success' && styles.radioCardSelected]}
                      onPress={() => setUpiType('success')}
                    >
                      <Ionicons
                        name={upiType === 'success' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={upiType === 'success' ? colors.success : colors.textSecondary}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.radioTitle}>success@razorpay</Text>
                        <Text style={styles.radioSubtitle}>Simulates instant UPI approval</Text>
                      </View>
                      <View style={styles.greenTag}>
                        <Text style={styles.greenTagText}>Succeed</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.radioCard, upiType === 'failure' && styles.radioCardSelected]}
                      onPress={() => setUpiType('failure')}
                    >
                      <Ionicons
                        name={upiType === 'failure' ? 'close-circle' : 'ellipse-outline'}
                        size={20}
                        color={upiType === 'failure' ? colors.error : colors.textSecondary}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.radioTitle}>failure@razorpay</Text>
                        <Text style={styles.radioSubtitle}>Simulates bank payment decline</Text>
                      </View>
                      <View style={styles.redTag}>
                        <Text style={styles.redTagText}>Fail</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === 'card' && (
                  <View style={styles.methodContent}>
                    <Text style={styles.sectionTitle}>Razorpay Test Card</Text>
                    <View style={styles.cardPreview}>
                      <View style={styles.cardChipRow}>
                        <View style={styles.cardChip} />
                        <Text style={styles.cardType}>VISA TEST</Text>
                      </View>
                      <Text style={styles.cardNumber}>4111  1111  1111  1111</Text>
                      <View style={styles.cardMetaRow}>
                        <View>
                          <Text style={styles.cardMetaLabel}>CARD HOLDER</Text>
                          <Text style={styles.cardMetaValue}>{customerName || 'AquaPure Customer'}</Text>
                        </View>
                        <View>
                          <Text style={styles.cardMetaLabel}>EXPIRES</Text>
                          <Text style={styles.cardMetaValue}>12/28</Text>
                        </View>
                        <View>
                          <Text style={styles.cardMetaLabel}>CVV</Text>
                          <Text style={styles.cardMetaValue}>123</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.cardNote}>
                      ✓ Automatically bypassed with test OTP 123456
                    </Text>
                  </View>
                )}

                {activeTab === 'netbanking' && (
                  <View style={styles.methodContent}>
                    <Text style={styles.sectionTitle}>Select Popular Bank</Text>
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank) => (
                      <TouchableOpacity
                        key={bank}
                        style={[styles.bankRow, selectedBank === bank && styles.bankRowSelected]}
                        onPress={() => setSelectedBank(bank)}
                      >
                        <Ionicons
                          name={selectedBank === bank ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={selectedBank === bank ? colors.primary : colors.textSecondary}
                        />
                        <Text style={styles.bankName}>{bank}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Test Mode Disclaimer */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                  <Text style={styles.disclaimerText}>
                    Razorpay Test Mode is active. No real funds or account transfers will be executed.
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => handleSimulatePayment(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.payBtnText}>Pay {formattedAmount}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.failBtn}
                  onPress={() => handleSimulatePayment(false)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.failBtnText}>Simulate Failure / Decline</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Security Footnote */}
          <View style={styles.securitySeal}>
            <Ionicons name="shield-checkmark" size={13} color={colors.textSecondary} />
            <Text style={styles.securityText}>
              Secured by Razorpay • 256-bit SSL encryption
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  gatewaySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  testBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  testBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  amountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  orderIdWrap: {
    alignItems: 'flex-end',
    maxWidth: 160,
  },
  orderIdLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orderIdValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 280,
  },
  methodContent: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  radioCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDFA',
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  radioSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  greenTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  greenTagText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  redTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  redTagText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },
  cardPreview: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardChip: {
    width: 34,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  cardType: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  cardNumber: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMetaLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  cardMetaValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardNote: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
    marginTop: 4,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  bankRowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDFA',
  },
  bankName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  payBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  failBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  failBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  processingWrap: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  processingStep: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  processingNotice: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  securitySeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    backgroundColor: colors.surfaceMuted,
  },
  securityText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
