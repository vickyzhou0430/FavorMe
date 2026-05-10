import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFFF6F5EF);
  static const surface = Color(0xFFFFFFFF);
  static const accent = Color(0xFF6F9F72);
  static const textPrimary = Color(0xFF1F251F);
  static const textSecondary = Color(0xFF69736A);
  static const borderSoft = Color(0xFFE5E1D8);
  static const loadingWash = Color(0xFFEEF5E8);
  static const errorWash = Color(0xFFFFF1EC);
  static const destructive = Color(0xFFC65A4A);
}

class AppTypography {
  static const caption = TextStyle(
    fontSize: 12,
    height: 1.4,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );
  static const body = TextStyle(
    fontSize: 14,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );
  static const action = TextStyle(
    fontSize: 16,
    height: 1.35,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
  static const heading = TextStyle(
    fontSize: 22,
    height: 1.2,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
}

class AppRadii {
  static const double card = 24;
  static const double optionPill = 999;
  static const double inputCapsule = 999;
}

class AppSizes {
  static const double minTouchTarget = 44;
  static const double optionMinHeight = 48;
  static const double inputMinHeight = 56;
}

class AppMotion {
  static const double pressScale = 0.98;
  static const pressSelectionMin = Duration(milliseconds: 120);
  static const pressSelectionMax = Duration(milliseconds: 220);
  static const pressDuration = Duration(milliseconds: 160);
  static const selectionDuration = Duration(milliseconds: 160);
  static const cardEntranceMin = Duration(milliseconds: 220);
  static const cardEntranceMax = Duration(milliseconds: 320);
  static const cardEntranceDuration = Duration(milliseconds: 260);
  static const loadingBreathDuration = Duration(milliseconds: 280);
  static const loadingMinimumDuration = Duration(milliseconds: 180);
  static const cardEntranceOffset = Offset(0, -8);
}

class AppShadows {
  // Shadow soft: rgba(52, 67, 50, 0.10)
  static final soft = [
    BoxShadow(
      color: const Color.fromRGBO(52, 67, 50, 0.10),
      blurRadius: 24,
      offset: const Offset(0, 12),
    ),
  ];
}

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.accent,
        primary: AppColors.accent,
        surface: AppColors.surface,
      ),
      scaffoldBackgroundColor: AppColors.background,
      fontFamilyFallback: const [
        'PingFang SC',
        'MiSans',
        'Noto Sans CJK SC',
      ],
      textTheme: const TextTheme(
        headlineSmall: AppTypography.heading,
        bodyMedium: AppTypography.body,
        labelLarge: AppTypography.action,
        labelSmall: AppTypography.caption,
      ),
    );
  }
}
