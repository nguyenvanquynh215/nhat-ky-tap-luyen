import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { C, PrimaryButton, styles as S } from '../components/ui';

type Step = 'email' | 'otp';

export default function AuthScreen() {
  const { sendOtp, verifyOtp, isRemote } = useApp();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    setError('');
    if (!emailValid) { setError('Hãy nhập email đúng định dạng, ví dụ: ten@gmail.com'); return; }
    setBusy(true);
    try {
      const res = await sendOtp(email);
      setDemoCode(res.demoCode);
      setStep('otp');
      startCountdown();
    } catch (e: any) {
      setError(e?.message || 'Không gửi được mã OTP. Thử lại sau nhé.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (value?: string) => {
    const token = (value ?? code).trim();
    setError('');
    // Supabase cho phép độ dài OTP từ 6–10 số tùy cài đặt project (project mới thường là 8)
    if (token.length < 6 || token.length > 10) { setError('Mã OTP gồm 6–10 số. Hãy nhập đủ mã trong email.'); return; }
    setBusy(true);
    try {
      await verifyOtp(email, token);
    } catch (e: any) {
      setError(e?.message || 'Mã OTP chưa đúng.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={local.wrap} keyboardShouldPersistTaps="handled">
        <View style={local.logoBox}>
          <Text style={local.logoIcon}>🏋️</Text>
        </View>
        <Text style={local.appName}>Nhật Ký Tập Luyện</Text>
        <Text style={[S.muted, { textAlign: 'center', marginTop: 6 }]}>
          Ghi lại mỗi buổi tập: tập bài gì, bao nhiêu hiệp,{'\n'}mỗi hiệp bao nhiêu cái — theo năm dương lịch.
        </Text>

        <View style={[S.card, { marginTop: 22, width: '100%' }]}>
          {step === 'email' ? (
            <>
              <Text style={S.h2}>Đăng nhập bằng email</Text>
              <Text style={[S.muted, { marginTop: 4 }]}>
                {isRemote
                  ? 'Nhập email, hệ thống sẽ gửi mã OTP vào hộp thư của bạn.'
                  : 'Chế độ demo: mã OTP sẽ hiện ngay trong app để bạn test thử.'}
              </Text>
              <Text style={S.label}>EMAIL CỦA BẠN</Text>
              <TextInput
                style={S.input}
                placeholder="ten@gmail.com"
                placeholderTextColor="#9AA79D"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              {!!error && <Text style={local.error}>{error}</Text>}
              <View style={{ height: 14 }} />
              <PrimaryButton title="Gửi mã OTP vào email →" onPress={handleSend} loading={busy} disabled={!emailValid} />
              <Text style={[S.muted, { marginTop: 12, fontSize: 12.5 }]}>
                Chưa có tài khoản? Cứ nhập email — tài khoản sẽ được tạo tự động khi bạn nhập đúng mã OTP lần đầu.
              </Text>
            </>
          ) : (
            <>
              <Text style={S.h2}>Nhập mã OTP</Text>
              <Text style={[S.muted, { marginTop: 4 }]}>
                Mã đã được gửi tới <Text style={{ fontWeight: '700', color: C.ink }}>{email}</Text>.
                Kiểm tra cả mục Spam/Quảng cáo nếu chưa thấy.
              </Text>

              {!!demoCode && (
                <View style={[S.banner, { marginTop: 12 }]}>
                  <Text style={{ fontSize: 13.5, color: '#7A5B00', lineHeight: 19 }}>
                    📧 <Text style={{ fontWeight: '800' }}>[Email giả lập — chế độ demo]</Text>{'\n'}
                    Mã OTP của bạn là: <Text style={{ fontWeight: '800', fontSize: 16 }}>{demoCode}</Text>{'\n'}
                    Khi nối Supabase thật, mã này sẽ được gửi vào email thật của bạn.
                  </Text>
                </View>
              )}

              <Text style={S.label}>MÃ OTP TRONG EMAIL</Text>
              <TextInput
                style={[S.input, local.otpInput, code.length > 6 && { fontSize: 22, letterSpacing: 5 }]}
                placeholder="••••••••"
                placeholderTextColor="#C4CFC2"
                keyboardType="number-pad"
                maxLength={10}
                value={code}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 10);
                  setCode(v);
                  // Chế độ demo mã luôn 6 số → tự đăng nhập khi nhập đủ.
                  // Chế độ thật: độ dài tùy project (6–10 số) → chờ người dùng bấm nút.
                  if (!isRemote && v.length === 6) void handleVerify(v);
                }}
              />
              <Text style={[S.muted, { marginTop: 6, fontSize: 12.5 }]}>
                Mã có thể dài 6–10 số tùy cài đặt Supabase (project mới thường là 8 số) — nhập đủ mã rồi bấm nút bên dưới.
              </Text>
              {!!error && <Text style={local.error}>{error}</Text>}
              <View style={{ height: 14 }} />
              <PrimaryButton title="Vào ứng dụng ✓" onPress={() => handleVerify()} loading={busy} disabled={code.length < 6} />
              <View style={[S.row, { justifyContent: 'space-between', marginTop: 14 }]}>
                <Text
                  style={local.link}
                  onPress={() => { setStep('email'); setCode(''); setError(''); }}
                >
                  ← Đổi email
                </Text>
                <Text
                  style={[local.link, countdown > 0 && { color: C.sub }]}
                  onPress={() => { if (countdown === 0) void handleSend(); }}
                >
                  {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã'}
                </Text>
              </View>
            </>
          )}
        </View>

        {!isRemote && (
          <View style={[S.banner, { width: '100%' }]}>
            <Text style={{ fontSize: 13, color: '#7A5B00', lineHeight: 19 }}>
              ⚙️ <Text style={{ fontWeight: '700' }}>Đang ở chế độ DEMO</Text> (chưa điền khóa Supabase trong file .env).
              Mọi tính năng đều dùng được, dữ liệu lưu trên máy này. Xem README để nối Supabase thật trong ~5 phút.
            </Text>
          </View>
        )}
        <Text style={[S.muted, { textAlign: 'center', fontSize: 12 }]}>
          Dữ liệu của bạn chỉ mình bạn xem được (bảo vệ bằng Row Level Security trên Supabase).
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const local = StyleSheet.create({
  wrap: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    padding: 20, maxWidth: 480, width: '100%', alignSelf: 'center',
  },
  logoBox: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 42 },
  appName: { fontSize: 27, fontWeight: '800', color: C.ink, marginTop: 14, textAlign: 'center' },
  otpInput: {
    fontSize: 28, fontWeight: '800', letterSpacing: 10, textAlign: 'center', paddingVertical: 14,
  },
  error: { color: C.red, fontSize: 13.5, marginTop: 10, lineHeight: 18 },
  link: { color: C.green, fontWeight: '700', fontSize: 14, paddingVertical: 4 },
});
