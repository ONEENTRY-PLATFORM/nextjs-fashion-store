# Избранное — полная схема функционала

## Источники данных

- **Redux store** → `state.wishlist.items: WishlistItem[]`
- **localStorage** → ключ `oe_store` → поле `wishlist` (автосохранение при каждом dispatch)
- **userData.ts** → `USER_DATASET.wishlist` + `USER_DATASET.waitingList` (серверные данные после логина)

---

## 1. Добавление / удаление из избранного

```mermaid
flowchart TD
    A([Пользователь кликает на сердечко]) --> B{Откуда?}

    B -->|ProductCard в каталоге| C["handleWishlist()\nProductCard.tsx:155"]
    B -->|Страница товара ProductDetailPage| D["onClick toggleItem()\nProductDetailPage.tsx:566"]

    C --> E["toggleItem(item)\nuseWishlist() → wishlistSlice"]
    D --> E

    E --> F{Товар уже в избранном?}
    F -->|Нет| G["wishlistSlice.addItem\nдобавляет в state.wishlist.items"]
    F -->|Да| H["wishlistSlice.removeItem\nудаляет из state.wishlist.items"]

    G --> I["saveToStorage()\nлокальное хранилище oe_store.wishlist"]
    H --> I

    G --> J["Иконка сердца: пустое → заполненное\nwishlisted = isWishlisted(id)"]
    H --> K["Иконка сердца: заполненное → пустое"]
```

**Что передаётся в `toggleItem`:**
- `id` — идентификатор товара
- `name`, `brand`, `price`, `salePrice`, `image`
- `colors[]` — массив hex-значений цветов
- `colorStock[]` — доступность каждого цвета (тот же индекс)
- `sizes[]`
- `badge` — метка (SALE, NEW и т.д.)
- `inStock` — общая доступность товара
- `selectedColor` — hex выбранного цвета в момент добавления

---

## 2. Определение состояния кнопки сердца

```mermaid
flowchart TD
    A([Компонент монтируется]) --> B["mounted = false\nwishlisted = false\nзащита от SSR-гидратации"]
    B --> C["useEffect → setMounted(true)"]
    C --> D["wishlisted = mounted && isWishlisted(product.id)"]
    D --> E{isWishlisted?}
    E -->|true| F["Сердце заполненное\nцвет ACCENT #F88A8A"]
    E -->|false| G["Сердце пустое\nцвет серый"]
```

---

## 3. Страница /favorites — FavoritesPage

```mermaid
flowchart TD
    A([Пользователь открывает /favorites]) --> B{items.length > 0?}

    B -->|Нет| C["EmptyState\nКнопки: Browse Women's Collection / Go to Home"]
    B -->|Да| D["Грид карточек FavoriteCard\nфильтр: все items без фильтрации по inStock"]

    D --> E["Карточка FavoriteCard\nотображает: фото, название, цену, свотчи цветов, размер"]

    E --> F{"inStock?\n(актуально из PRODUCT_CATALOG,\nне из закэшированного localStorage)"}
    F -->|Нет| G["Фото: grayscale + opacity-60\nБейдж: Out of Stock\nHover-оверлей скрыт\nнельзя добавить в корзину"]
    F -->|Да| H["Hover → оверлей снизу\nкнопки: Add to Cart + Quick View"]

    H --> I["Add to Cart\naddToCart с id=item.id+'-fav'\nразмер: selectedSize ?? sizes[0] ?? 'M'\nцвет: colors[selectedColor]"]
    H --> J["Quick View\nopenQuickView(product, selectedColor)\nМодаль открывается с выбранным цветом"]
```

---

## 4. Смена цвета в FavoriteCard

```mermaid
flowchart TD
    A([Клик на свотч цвета]) --> B{colorStock[idx] === false\nили !item.inStock?}

    B -->|Да — OOS| C["Ничего не происходит\nСвотч: opacity-60, cursor-not-allowed\nЗачёркивание по диагонали"]
    B -->|Нет — доступен| D["setSelectedColor(idx)\nлокальный state"]

    D --> E["updateSelection(item.id, item.colors[idx])\nсохраняется в Redux + localStorage"]
```

> **Задача #24** — исправлено: после `setSelectedColor(idx)` вызывается
> `updateSelection(item.id, item.colors[idx])` — цвет сохраняется в localStorage.

---

## 5. Удаление из FavoritesPage

```mermaid
flowchart TD
    A([Клик на заполненное сердце]) --> B["handleRemove()\nsetRemoving(true)\nанимация: opacity 0, scale 0.97"]
    B --> C["setTimeout 250ms"]
    C --> D["removeItem(item.id)\nuseWishlist → wishlistSlice.removeItem"]
    D --> E["item исчезает из state.wishlist.items"]
    E --> F["saveToStorage() → localStorage обновлён"]
    E --> G{items.length === 0?}
    G -->|Да| H["Показывается EmptyState"]
    G -->|Нет| I["Грид перерисовывается без удалённого товара"]
```

---

## 6. Переход на карточку товара из Favorites

```mermaid
flowchart TD
    A([Клик на карточку FavoriteCard]) --> B["handleCardClick()\nURLSearchParams: color=hex, size=selectedSize"]
    B --> C["router.push('/product/id?color=...&size=...')"]
    C --> D["ProductDetailPage монтируется"]
    D --> E["Читает ?color= и ?size= из searchParams"]
    E --> F["Открывает товар с предвыбранным цветом и размером"]
```

---

## 7. Страница /account?tab=wishlist — WishlistSection

```mermaid
flowchart TD
    A([Пользователь в личном кабинете → Wishlist]) --> B["WishlistSection\nчитает: useWishlist().items"]
    B --> C["Фильтр: items.filter(i => i.inStock)\nПоказываются ТОЛЬКО товары в наличии"]
    C --> D{inStockItems.length > 0?}
    D -->|Нет| E["Пустое состояние с иконкой сердца"]
    D -->|Да| F["Грид WishlistCard\n2–3 колонки"]

    F --> G["WishlistCard\nAdd to Cart (без реального dispatch)\nQuick View → переход на /product/id\nУдаление → removeItem(id)"]

    note1["⚠️ Add to Cart в WishlistCard\nтолько анимация 'Added!'\nв корзину НЕ добавляет\n(нет вызова addToCart из useCart)"]
    G --> note1

    style note1 fill:#fffbeb,stroke:#fde68a,color:#92400e
```

---

## 8. Синхронизация после логина

```mermaid
flowchart TD
    A([Пользователь вводит логин/пароль]) --> B["AuthContext.login()\nvalidateCredentials()"]
    B --> C{Учётные данные верны?}
    C -->|Нет| D["login() возвращает false\nПоказывается ошибка"]
    C -->|Да| E["isLoggedIn = true\nuser = MOCK_USER"]

    E --> F["WishlistSyncEffect (Providers.tsx)\nuseEffect на isLoggedIn"]
    F --> G["dispatch(mergeUserWishlist({\n  wishlist: USER_DATASET.wishlist,\n  waitingList: USER_DATASET.waitingList\n}))"]

    G --> H["wishlistSlice.mergeUserWishlist reducer"]
    H --> I["serverItems = wishlist + waitingList\n(преобразованы через fromDataWishlist / fromWaitingItem)"]
    I --> J["guestOnly = items гостя, которых нет на сервере"]
    J --> K["state.wishlist.items = [...serverItems, ...guestOnly]\nСерверные товары в приоритете"]
    K --> L["saveToStorage() → localStorage обновлён"]
```

---

## 9. Персистентность: сохранение и загрузка

```mermaid
flowchart TD
    A["Любой dispatch в wishlistSlice"] --> B["store.subscribe() → saveToStorage()"]
    B --> C["localStorage['oe_store'] = JSON.stringify({\n  wishlist: state.wishlist,\n  ...\n})"]

    D([Пользователь открывает сайт заново]) --> E["makeStore() → loadFromStorage()"]
    E --> F{localStorage['oe_store'] существует?}
    F -->|Нет| G["Пустой wishlist"]
    F -->|Да| H["Читает __version, запускает миграции"]
    H --> I["preloadedState.wishlist = сохранённые данные"]
    I --> J["Redux store инициализирован с сохранёнными избранными"]
    J --> K["Пользователь видит свои избранные сразу\nбез запроса к серверу"]
```

---

## 10. Полная карта состояний WishlistItem

```mermaid
stateDiagram-v2
    [*] --> НетВИзбранном

    НетВИзбранном --> ВИзбранном : toggleItem() / addItem()\nсердце пустое → заполненное

    ВИзбранном --> НетВИзбранном : toggleItem() / removeItem()\nсердце заполненное → пустое

    ВИзбранном --> ВИзбранном_ОтображаетсяНаFavorites : переход /favorites

    state ВИзбранном_ОтображаетсяНаFavorites {
        [*] --> ВНаличии
        [*] --> НетВНаличии

        ВНаличии --> ВКорзине : Add to Cart
        ВНаличии --> ЦветИзменён : смена свотча\n(✅ сохраняется через updateSelection)
        ВНаличии --> ПерешёлНаТовар : клик на карточку

        НетВНаличии --> ПерешёлНаТовар : клик на карточку
        НетВНаличии --> НетВИзбранном : удаление
        ВНаличии --> НетВИзбранном : удаление (анимация 250ms)
    }

    ВИзбранном --> ВWaitingList : mergeUserWishlist после логина\n(если был в waitingList на сервере)
```

---

## 11. Рекомендации и Trending на /favorites

```mermaid
flowchart TD
    A["FavoritesPage монтируется"] --> B["Статичные данные из homepageProducts.ts"]
    B --> C["FAVORITES_RECOMMENDED → карусель 'You May Also Like'"]
    B --> D["FAVORITES_TRENDING → карусель 'Trending Now'"]
    C --> E["Показывается всегда\nнезависимо от наличия избранных"]
    D --> E
    E --> F["Quick Add кнопка в карусели\nтолько UI-анимация\nреального добавления в корзину нет"]
```
