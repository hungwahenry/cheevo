import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { giphyService, GiphyGif } from '@/src/services/giphy.service';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Search, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Modal, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: GiphyGif) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ visible, onClose, onSelectGif }) => {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  
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
      <View style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
          <Text variant="title">Choose a GIF</Text>
          <Button 
            variant="ghost"
            size="icon"
            icon={X}
            onPress={handleClose}
            style={styles.closeButton}
          />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search GIFs..."
            value={searchQuery}
            onChangeText={handleSearch}
            icon={Search}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Content */}
        {isLoading && gifs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={mutedColor} />
            <Text variant="caption" style={[styles.loadingText, { color: mutedColor }]}>
              {searchQuery ? 'Searching GIFs...' : 'Loading trending GIFs...'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.gifGrid, { paddingBottom: insets.bottom + 16 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gifItem}
                onPress={() => selectGif(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.images.fixed_height.url }}
                  style={styles.gifThumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Text variant="body" style={[styles.emptyText, { color: mutedColor }]}>
                    {searchQuery ? 'No GIFs found for "' + searchQuery + '"' : 'No GIFs available'}
                  </Text>
                </View>
              ) : null
            }
            refreshing={isLoading}
            onRefresh={loadTrendingGifs}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    marginRight: -8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  gifGrid: {
    padding: 12,
    gap: 8,
  },
  gifItem: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gifThumbnail: {
    width: '100%',
    height: 140,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});