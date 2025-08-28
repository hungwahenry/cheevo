import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { giphyService, GiphyGif } from '@/src/services/giphy.service';
import { Search, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Modal, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ModalProps 
} from 'react-native';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: GiphyGif) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ visible, onClose, onSelectGif }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTrendingGifs();
    }
  }, [visible]);

  const loadTrendingGifs = async () => {
    setIsLoading(true);
    const result = await giphyService.getTrendingGifs(20);
    if (result.success) {
      setGifs(result.data || []);
    }
    setIsLoading(false);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }
    
    setIsLoading(true);
    const result = await giphyService.searchGifs(query, 20);
    
    if (result.success) {
      setGifs(result.data || []);
    } else {
      console.error('Giphy search failed:', result.error);
    }
    setIsLoading(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchGifs(query);
  };

  const selectGif = (gif: GiphyGif) => {
    onSelectGif(gif);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="title">Choose a GIF</Text>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} />
          </TouchableOpacity>
        </View>

        <Input
          placeholder="Search GIFs..."
          value={searchQuery}
          onChangeText={handleSearch}
          icon={Search}
          containerStyle={styles.searchInput}
        />

        <FlatList
          data={gifs}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gifGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gifItem}
              onPress={() => selectGif(item)}
            >
              <Image
                source={{ uri: item.images.fixed_height.url }}
                style={styles.gifThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          refreshing={isLoading}
          onRefresh={loadTrendingGifs}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    margin: 20,
  },
  gifGrid: {
    padding: 10,
  },
  gifItem: {
    flex: 1,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gifThumbnail: {
    width: '100%',
    height: 120,
  },
});