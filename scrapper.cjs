require('dotenv').config({ path: './.env' });

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

fetchMenuLinks = async () => {
  try {
    let menuLinks = [];
    const { data } = await axios.get(process.env['URL']);
    const $ = cheerio.load(data);

    $('ul.submenu__cont-inner').each((index, navBarMenu) => {
      if (index % 2 === 0) {
        $(navBarMenu)
          .find('a.submenu__link')
          .each((i, subMenu) => {
            menuLinks.push($(subMenu).attr('href'));
          });
      }
    });

    return menuLinks;
  } catch (error) {
    console.error('Product Detail: ', error.message);
  }
};

parsePagination = async (fullMenuLink) => {
  try {
    const { data } = await axios.get(fullMenuLink);
    const $ = cheerio.load(data);
    let productsLinks = [];
    totalProducts = Number(
      $('.externalWrapperFilter').attr('data-total-products')
    );
    productsPerPage = 24;
    totalPages = Math.ceil(totalProducts / productsPerPage);
    for (let page = 1; page <= totalPages; page++) {
      links = await fetchProductsLinks(fullMenuLink + `?page=${page}`);
      productsLinks = productsLinks.concat(links);
    }
    return productsLinks;
  } catch (error) {
    console.error('Parse Pagination: Error', error.message);
  }
};

fetchProductsLinks = async (fullMenuLink) => {
  try {
    let productsLinks = [];
    const { data } = await axios.get(fullMenuLink);
    const $ = cheerio.load(data);

    $('a.productQB__title').each((index, content) => {
      productsLinks.push($(content).attr('href'));
    });
    return productsLinks;
  } catch (error) {
    console.error('Product Links: Promise error', fullMenuLink, error.message);
  }
};

parseProductsLinks = async (products) => {
  let totalCount = 0;
  try {
    for (let productLink of productsLinks) {
      const productDetail = await fetchProductDetail(
        process.env['URL'] + productLink
      );
      if (productDetail) {
        products[productDetail.productCode] = productDetail;
        products['productCount'] += 1;
        totalCount += 1;
        console.log(totalCount);
      }
    }
  } catch (error) {
    console.error('Parse Product Links: error', error.message);
  } finally {
    return totalCount;
  }
};

fetchProductDetail = async (productLink) => {
  try {
    let productDetail = {};

    const { data } = await axios.get(productLink);
    const $ = cheerio.load(data);

    let breadcrumb = [];
    $('.breadcrumbs__link').each((index, content) => {
      breadcrumb.push($(content).find('span').text().replace(/\s+/g, ' '));
    });
    let features = [];
    $('.tabCont__par li').each((index, content) => {
      features.push($(content).text());
    });

    let images = [];
    $('a.js-openZoom').each((index, content) => {
      images.push($(content).find('picture > img').attr(':data-src'));
    });
    productDetail = await {
      url: productLink,
      title: $('.pDetails__title').text(),
      productCode: $('.tabCont__par').find('b').text(),
      description: $('.tabCont__par')
        .find('p')
        .text()
        .replace(/\s+/g, ' ')
        .trim(),
      features,
      images,
    };
    return productDetail;
  } catch (error) {
    console.error('Product Detail: Promise error', productLink, error.message);
  }
};

save = async (productDetail) => {
  const productJson = JSON.stringify(productDetail) + '\n';
  fs.writeFile('products.json', productJson, (err) => {
    if (err) {
      throw err;
    }
    console.log('JSON data is saved.');
  });
  return true;
};

splitGenderAndCatagory = (menuLink) => {
  splittedLink = menuLink.split('.html')[0].split('/');
  gender = splittedLink[splittedLink.length - 2];
  catagory = splittedLink[splittedLink.length - 1];
  return [gender, catagory];
};

(fetchPrada = async () => {
  try {
    let productsRecord = { totalProducts: 0 };
    let menuLinks = await fetchMenuLinks();

    for (let menuLink of menuLinks) {
      let products = { productCount: 0 };

      [gender, catagory] = splitGenderAndCatagory(menuLink);
      if (!(gender in productsRecord))
        productsRecord[gender] = { totalCount: 0 };
      productsRecord[gender][catagory] = {};

      productsLinks = await parsePagination(process.env['URL'] + menuLink);
      let totalCount = await parseProductsLinks(products);

      productsRecord[gender][catagory] = products;
      productsRecord[gender]['totalCount'] += totalCount;
      productsRecord['totalProducts'] += productsRecord[gender]['totalCount'];
      hasSaved = await save(productsRecord);
    }
  } catch (error) {
    console.error('Fetch Parada Error: ', error.message);
  }
})();
