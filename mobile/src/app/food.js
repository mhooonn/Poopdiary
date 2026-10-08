
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { listFood, createFood, deleteFood } from '../data/api';

export default function FoodRoute() {
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('');
  const [notes, setNotes] = useState('');
  
    const [foods, setFoods] = useState(
    /** @type {{id: number, food_name: string, meal_type: string | null, date: string, notes: string | null}[]} */ ([])
    );

  const [loading, setLoading] = useState(false);

  // Load saved food entries
  async function loadFoods() {
    try {
      const data = await listFood();
      setFoods(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  useEffect(() => {
    loadFoods();
  }, []);

  // Add a new food entry
  async function handleAddFood() {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name.');
      return;
    }

    setLoading(true);

    try {
      await createFood({
        foodName: foodName.trim(),
        mealType: mealType.trim(),
        date: new Date().toLocaleDateString('en-CA'),
        notes: notes.trim(),
      });

      setFoodName('');
      setMealType('');
      setNotes('');

      await loadFoods();

      Alert.alert('Success', 'Food entry added!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  /** @param {number} id */
    async function handleDeleteFood(id) {
    try {
      await deleteFood(id);
      await loadFoods();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={foods}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Food Diary</Text>

            <Text style={styles.label}>Food Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Pizza"
              value={foodName}
              onChangeText={setFoodName}
            />

            <Text style={styles.label}>Meal Type</Text>
            <TextInput
              style={styles.input}
              placeholder="Breakfast, Lunch, Dinner..."
              value={mealType}
              onChangeText={setMealType}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Optional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFood}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : 'Add Food'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.subtitle}>Food History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.foodItem}>
            <View style={styles.foodDetails}>
              <Text style={styles.foodName}>{item.food_name}</Text>

              <Text style={styles.foodInfo}>
                {item.meal_type || 'Other'} • {item.date}
              </Text>

              {item.notes ? (
                <Text style={styles.foodNotes}>{item.notes}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteFood(item.id)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No food entries yet.</Text>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 45,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#222',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  notesInput: {
    height: 75,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 21,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    color: '#222',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  foodDetails: {
    flex: 1,
    marginRight: 10,
  },
  foodName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
  foodInfo: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  foodNotes: {
    fontSize: 14,
    color: '#555',
    marginTop: 6,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteText: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});
