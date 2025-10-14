// Hamburger Menu Component
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../theme';

interface HamburgerMenuProps {
  style?: any;
}

export function HamburgerMenu({ style }: HamburgerMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: '📅 Calendar View', route: '/calendar-view', description: 'Edit current week meals' },
    { label: '📊 Weekly Summary', route: '/weekly-summary', description: 'View progress trends' },
    { label: '🍽️ Meal Prep', route: '/meal-prep', description: 'Plan upcoming meals' },
    { label: '📖 All Recipes', route: '/all-recipes', description: 'Browse recipe collection' },
    { label: '📸 Progress Photos', route: '/photo-timeline', description: 'Track visual progress' },
    { label: '⚙️ Settings', route: '/settings', description: 'App preferences' },
  ];

  const handleMenuItemPress = (route: string) => {
    setIsOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.hamburger, style]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item.route)}
              >
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hamburger: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  line: {
    width: 20,
    height: 2,
    backgroundColor: theme.colors.primary,
    marginVertical: 2,
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: 40,
    ...theme.shadows.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  menuTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  closeButton: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: '300',
  },
  menuItem: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  menuItemDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
